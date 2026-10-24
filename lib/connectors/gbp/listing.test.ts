import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { ExecStep } from "@/lib/agent/executor";
import { describeDb, seedRestaurant } from "@/tests/helpers/db";
import { fakeFetch } from "@/tests/helpers/fake-fetch";
import {
  diffListing,
  freshnessIssues,
  hoursFromGoogle,
  hoursFromWebsiteHtml,
  hoursToGoogle,
  type HoursPeriod,
  type ListingSnapshot,
} from "@/lib/connectors/gbp/listing";
import { parseHoursStatement } from "@/lib/kob/talk/fallback";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.INTEGRATION_ENC_KEY ??= Buffer.alloc(32, 7).toString("base64");
});
vi.mock("@/lib/ai/gemini-config", () => ({
  isGeminiConfigured: () => false,
  geminiTextCompletion: async () => ({ ok: false, error: "not configured" }),
}));

const week = (sundayClose: string): HoursPeriod[] => [
  ...(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const).map((day) => ({ day, open: "12:00", close: "22:30" })),
  { day: "SUNDAY", open: "12:00", close: sundayClose },
];

const snapshot = (over: Partial<ListingSnapshot> = {}): ListingSnapshot => ({
  location: "accounts/1/locations/2",
  takenAt: "2026-10-22T05:00:00Z",
  title: "Godfather",
  websiteUri: "https://godfather.example",
  hours: week("21:00"),
  specialHours: [],
  categories: ["Steak house"],
  description: "Dry-aged steaks in Cape Town.",
  photoCount: 40,
  lastPhotoAt: "2026-10-01T10:00:00Z",
  lastPostAt: "2026-10-10T10:00:00Z",
  livePosts: 2,
  ...over,
});

const NOW = new Date("2026-10-22T05:00:00Z");

describe("listing hours", () => {
  it("reads schema.org opening hours from a website", () => {
    const html = `<html><script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Restaurant",
      openingHoursSpecification: [
        { dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], opens: "12:00", closes: "22:30" },
        { dayOfWeek: "https://schema.org/Sunday", opens: "12:00:00", closes: "22:00:00" },
      ],
    })}</script></html>`;
    expect(hoursFromWebsiteHtml(html)).toEqual(week("22:00"));
    expect(hoursFromWebsiteHtml(`<script type="application/ld+json">{"@type":"Restaurant","openingHours":["Mo-Sa 12:00-22:30","Su 12:00-22:00"]}</script>`)).toEqual(week("22:00"));
    expect(hoursFromWebsiteHtml("<p>Open daily</p>")).toBeNull();
  });

  it("round-trips Google hours, including a close after midnight", () => {
    const late: HoursPeriod[] = [{ day: "FRIDAY", open: "18:00", close: "01:00" }];
    expect(hoursToGoogle(late)).toEqual([{ openDay: "FRIDAY", openTime: { hours: 18 }, closeDay: "SATURDAY", closeTime: { hours: 1 } }]);
    expect(hoursFromGoogle(hoursToGoogle(late))).toEqual(late);
  });

  it("flags a Sunday mismatch, stale photos and no recent post; nothing when all is fresh", () => {
    const issues = freshnessIssues(snapshot({ lastPhotoAt: "2026-06-01T00:00:00Z", lastPostAt: null }), week("22:00"), NOW);
    expect(issues.map((i) => i.key)).toEqual(["hours_mismatch", "photos_stale", "no_recent_post"]);
    expect(issues[0].title).toBe("Sunday hours differ from your website");
    expect(issues[0].detail).toBe("Sunday: Google 12:00–21:00, website 12:00–22:00");
    expect(freshnessIssues(snapshot(), week("21:00"), NOW)).toEqual([]);
    expect(freshnessIssues(snapshot(), null, NOW)).toEqual([]);
  });

  it("records what changed between two reads", () => {
    expect(diffListing(null, snapshot())).toEqual([]);
    expect(diffListing(snapshot(), snapshot({ hours: week("22:00"), photoCount: 42 })).map((c) => c.field)).toEqual(["hours", "photos"]);
  });

  it("understands an owner's hours change", () => {
    expect(parseHoursStatement("Our hours changed to close at 22:00 on Sundays.")).toEqual({ days: ["SUNDAY"], close: "22:00" });
    expect(parseHoursStatement("We open at 11am on Mondays and Tuesdays")).toEqual({ days: ["MONDAY", "TUESDAY"], open: "11:00" });
    expect(parseHoursStatement("we're busy on Sundays")).toBeNull();
  });
});

describeDb("Google listing: read, compare, propose, approve, read back", () => {
  const LOCATION = "accounts/3011000000000000001/locations/6633000000000000001";
  const LOC_ID = "locations/6633000000000000001";
  const step: ExecStep = { run: (_id, fn) => fn(), sleep: async () => undefined, sleepUntil: async () => undefined, sendEvent: async () => undefined };
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let restaurantId: string;
  let userId: string;

  /** A fake Google that remembers writes, plus the restaurant's website. */
  function google(opts: { sundayClose?: string; siteSundayClose?: string } = {}) {
    let hours = hoursToGoogle(week(opts.sundayClose ?? "21:00"));
    const posts: { name: string; summary: string; state: string; createTime: string }[] = [];
    const site = `<script type="application/ld+json">${JSON.stringify({ "@type": "Restaurant", openingHours: ["Mo-Sa 12:00-22:30", `Su 12:00-${opts.siteSundayClose ?? "22:00"}`] })}</script>`;
    return fakeFetch([
      { method: "GET", match: /godfather\.example/, reply: { text: site } },
      {
        method: "GET",
        match: new RegExp(`/v1/${LOC_ID}\\?readMask=`),
        reply: () => ({ json: { name: LOC_ID, title: "Godfather", websiteUri: "https://godfather.example", regularHours: { periods: hours }, profile: { description: "Steaks." } } }),
      },
      {
        method: "PATCH",
        match: new RegExp(`/v1/${LOC_ID}\\?updateMask=regularHours$`),
        reply: (call) => {
          hours = (call.body as { regularHours: { periods: typeof hours } }).regularHours.periods;
          return { json: { name: LOC_ID, regularHours: { periods: hours } } };
        },
      },
      { method: "GET", match: /\/media\?/, reply: { json: { mediaItems: [{ name: "m1", createTime: "2026-05-01T10:00:00Z" }], totalMediaItemCount: 1 } } },
      { method: "GET", match: /\/localPosts\?/, reply: () => ({ json: { localPosts: posts } }) },
      {
        method: "POST",
        match: /\/localPosts$/,
        reply: (call) => {
          const post = { name: `${LOCATION}/localPosts/p${posts.length + 1}`, summary: (call.body as { summary: string }).summary, state: "LIVE", createTime: new Date().toISOString() };
          posts.push(post);
          return { json: post };
        },
      },
      { method: "GET", match: /\/localPosts\/p\d+$/, reply: (call) => ({ json: posts.find((p) => call.url.endsWith(p.name))! }) },
    ]);
  }

  async function run(fetch: typeof globalThis.fetch, actionId: string) {
    const { createGbpAdapter } = await import("@/lib/connectors/gbp/adapter");
    const { executeApprovedAction } = await import("@/lib/agent/executor");
    const adapter = createGbpAdapter({ fetch });
    return executeApprovedAction({ actionId, restaurantId, connectorKey: `${restaurantId}:GBP` }, step, () => adapter);
  }

  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
    const { encryptSecret } = await import("@/lib/crypto/tokens");
    const seeded = await seedRestaurant(prisma);
    restaurantId = seeded.restaurant.id;
    userId = seeded.userId;
    await prisma.restaurant.update({ where: { id: restaurantId }, data: { name: "Godfather", website: "https://godfather.example", countryCode: "ZA", timezone: "Africa/Johannesburg" } });
    await prisma.integration.create({
      data: {
        restaurantId,
        provider: "GBP",
        status: "CONNECTED",
        externalAccountId: LOCATION,
        metadata: { locationIds: [LOCATION] },
        encryptedAccessToken: encryptSecret("g-tok"),
        accessTokenExpiresAt: new Date(Date.now() + 3_600_000),
      },
    });
    await prisma.featureFlagOverride.create({ data: { restaurantId, name: "GBP_LIVE", enabled: true } });
  });
  afterAll(async () => {
    await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
  });

  it("a Sunday mismatch with the website becomes one approvable fix; approving PATCHes once and reads it back", async () => {
    const { syncListing } = await import("@/lib/connectors/gbp/listing-sync");
    const { gbpClient } = await import("@/lib/connectors/gbp/client");
    const g = google();
    const first = await syncListing(restaurantId, gbpClient("g-tok", g.fetch), LOCATION, { now: NOW, fetch: g.fetch });
    expect(first.snapshot.hours).toEqual(week("21:00"));
    expect(first.issues.map((i) => i.key)).toEqual(["hours_mismatch", "photos_stale", "no_recent_post"]);
    expect(first.hoursProposed).toBe(true);
    expect(first.tasksCreated).toBe(2);

    // A second check the same morning doesn't pile up duplicates.
    const again = await syncListing(restaurantId, gbpClient("g-tok", g.fetch), LOCATION, { now: NOW, fetch: g.fetch });
    expect(again.tasksCreated).toBe(0);
    const proposals = await prisma.osAction.findMany({ where: { restaurantId, actionType: "gbp.hours.regular.update" } });
    expect(proposals).toHaveLength(1);
    expect(proposals[0].status).toBe("AWAITING_APPROVAL");
    expect(g.calls.filter((c) => c.method !== "GET")).toHaveLength(0);

    const { approve } = await import("@/lib/agent/ledger");
    await approve(proposals[0].id, userId);
    expect(await run(g.fetch, proposals[0].id)).toEqual({ status: "VERIFIED" });
    const patches = g.calls.filter((c) => c.method === "PATCH");
    expect(patches).toHaveLength(1);
    expect(hoursFromGoogle((patches[0].body as { regularHours: { periods: never } }).regularHours.periods)).toEqual(week("22:00"));

    // The next read records the change and no longer flags a mismatch.
    const after = await syncListing(restaurantId, gbpClient("g-tok", g.fetch), LOCATION, { now: new Date(NOW.getTime() + 3_600_000), fetch: g.fetch });
    expect(after.changes.map((c) => c.field)).toEqual(["hours"]);
    expect(after.issues.map((i) => i.key)).not.toContain("hours_mismatch");
  });

  it("an approved Google post is created once and done only when Google shows it live", async () => {
    const { proposeAction } = await import("@/lib/agent/propose");
    const { approve } = await import("@/lib/agent/ledger");
    const g = google();
    const { action } = await proposeAction({
      restaurantId,
      title: "Post: Tuesday steak night",
      payload: { actionType: "gbp.post.create", gbpLocationId: LOCATION, summary: "Tuesday steak night: 300g sirloin and a glass of red. Book a table.", topicType: "STANDARD" },
      channelOrigin: "WEB",
      requestedByUserId: userId,
    });
    expect(action.status).toBe("AWAITING_APPROVAL");
    await approve(action.id, userId);
    expect(await run(g.fetch, action.id)).toEqual({ status: "VERIFIED" });
    expect(g.calls.filter((c) => c.method === "POST")).toHaveLength(1);
  });

  it("Talk: an owner's Sunday change is prepared for approval, never claimed as done", async () => {
    const { answerFromFacts } = await import("@/lib/kob/talk/fallback");
    await prisma.osAction.deleteMany({ where: { restaurantId, actionType: "gbp.hours.regular.update" } });
    const a = await answerFromFacts(restaurantId, userId, "Our hours changed to close at 23:00 on Sundays.", { now: NOW });
    expect(a.intent).toBe("hours");
    expect(a.text).toMatch(/Sunday 12:00–22:00 → 12:00–23:00/);
    expect(a.text).toMatch(/waiting in Needs you/);
    expect(a.text).not.toMatch(/verified|updated your/i);
    const waiting = await prisma.osAction.findFirstOrThrow({ where: { restaurantId, actionType: "gbp.hours.regular.update" } });
    expect(waiting.status).toBe("AWAITING_APPROVAL");
  });
});
