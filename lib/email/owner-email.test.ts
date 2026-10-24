import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { describeDb } from "@/tests/helpers/db";
import { bannedWordsIn } from "@/lib/copy/banned-words";
import * as T from "./templates";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.NEXT_PUBLIC_APP_URL = "https://app.test";
});
vi.mock("@/lib/ai/gemini-config", () => ({
  isGeminiConfigured: () => false,
  geminiTextCompletion: async () => ({ ok: false, error: "off" }),
  geminiJsonCompletion: async () => ({ ok: false, error: "off" }),
}));

const L = T.links("https://app.test", "r1");
const ALL: T.Email[] = [
  T.welcomeEmail({ name: "Godfather", trialEnds: "Thursday 8 October", price: "US$99", links: L }),
  T.dailyBriefEmail({ name: "Godfather", greeting: "Good morning, Godfather.", needToKnow: ["2 new reviews since yesterday."], approvals: [{ id: "a1", title: "Reply to Thandi's 1-star Google review" }], tasks: ["Plan for Heritage Day (5 days away)"], links: L }),
  T.weeklySummaryEmail({ name: "Godfather", reviewsThisWeek: 6, reviewsLastWeek: 4, published: 3, waiting: 1, links: L }),
  T.trialEndingEmail({ name: "Godfather", ends: "Thursday 8 October", price: "US$99", links: L }),
  T.trialEndedEmail({ name: "Godfather", price: "US$99", links: L }),
  T.publishedEmail({ name: "Godfather", title: "Reply to Thandi's 1-star Google review", where: "your Google reviews", actionId: "a1", links: L }),
  T.reconnectGoogleEmail({ name: "Godfather", links: L }),
];

describe("owner email copy", () => {
  it("never uses the banned words, and AI only matches as a whole word", () => {
    for (const e of ALL) expect(bannedWordsIn(`${e.subject}\n${e.text}\n${e.html}`), e.subject).toEqual([]);
    expect(bannedWordsIn("Our AI agent posts automatically")).toEqual(["AI", "agent", "automatically"]);
    expect(bannedWordsIn("Thai curry, said the chair; maintain the main")).toEqual([]);
  });

  it("every link opens the app (login required) and the brief links each approval", () => {
    for (const e of ALL) for (const href of e.html.match(/href="([^"]+)"/g) ?? []) expect(href).toMatch(/href="https:\/\/app\.test\/(app|dashboard\/billing)/);
    expect(ALL[1].html).toContain("https://app.test/app/actions/a1?r=r1");
    expect(ALL[1].subject).toBe("Godfather: 2 things for you today");
  });

  it("escapes names", () => {
    expect(T.welcomeEmail({ name: `Harbour & Rye <b>`, trialEnds: "x", price: "£79", links: L }).html).toContain("Harbour &amp; Rye &lt;b&gt;");
  });
});

describeDb("30 days of owner emails", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  const ids: string[] = [];
  const DAY = 86_400_000;
  // A different month from lib/billing/trial.test.ts, whose expireTrials() would otherwise end these trials too.
  const START = new Date("2027-03-03T05:00:00Z"); // Wed 07:00 Cape Town, 05:00 Bristol

  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
  });
  afterEach(async () => {
    (await import("./transport")).useTransport(null);
  });
  afterAll(async () => {
    await prisma.restaurant.deleteMany({ where: { id: { in: ids } } });
  });

  async function venue(name: string, country: string, tz: string) {
    const { startTrial } = await import("@/lib/billing/trial");
    const user = await prisma.user.create({ data: { id: crypto.randomUUID(), email: `${name.toLowerCase().replace(/\W+/g, "")}-${Date.now()}@example.com` } });
    const r = await prisma.restaurant.create({ data: { name, slug: `${name.toLowerCase().replace(/\W+/g, "-")}-${Date.now()}`, countryCode: country, timezone: tz } });
    ids.push(r.id);
    await prisma.teamMember.create({ data: { userId: user.id, restaurantId: r.id, role: "OWNER" } });
    await startTrial(prisma, r.id, user.id, START);
    const { setNights } = await import("@/lib/venue/nights");
    await setNights(r.id, "quiet", ["TUE"], START);
    return r;
  }

  /** Hourly trial tick + 07:00 local morning run, for `days` days. `onDay` lets the owner act. */
  async function simulate(restaurantId: string, tz: string, days: number, onDay?: (d: number, now: Date) => Promise<void>) {
    const { expireTrials, trialsEndingSoon } = await import("@/lib/billing/trial");
    const owner = await import("./owner");
    const { morningDue, isLocalMonday } = await import("./schedule");
    const { generateDailyRecommendationsForRestaurant } = await import("@/lib/demand-engine/generate-daily-recommendations");
    for (let q = 0; q < days * 96; q++) {
      const now = new Date(START.getTime() + q * 15 * 60_000);
      if (q % 4 === 0) {
        for (const r of await expireTrials(now, [restaurantId])) await owner.sendTrialEnded(r.id);
        for (const r of await trialsEndingSoon(now, { only: [restaurantId] })) await owner.sendTrialEnding(r.id);
      }
      const row = await prisma.restaurant.findUniqueOrThrow({ where: { id: restaurantId }, select: { billingStatus: true } });
      if (["TRIALING", "ACTIVE"].includes(row.billingStatus) && morningDue(now, tz)) {
        const d = Math.floor((now.getTime() - START.getTime()) / DAY);
        if (d % 2 === 0)
          await prisma.customerReview.create({ data: { restaurantId, source: "OTHER", reviewerName: `Guest ${d}`, rating: d % 4 ? 5 : 2, body: "Dinner.", reviewedAt: now } });
        await onDay?.(d, now);
        await generateDailyRecommendationsForRestaurant(restaurantId, { now });
        await owner.sendDailyBrief(restaurantId, now);
        await owner.sendDailyBrief(restaurantId, now); // a retry the same morning sends nothing new
        if (isLocalMonday(now, tz)) await owner.sendWeeklySummary(restaurantId, now);
      }
    }
  }

  it("Godfather never adds a card: welcome, daily briefs, the day-5 reminder and the trial-ended email, then quiet", async () => {
    const { captureTransport, useTransport } = await import("./transport");
    const cap = captureTransport();
    useTransport(cap.transport);
    const r = await venue("Godfather", "ZA", "Africa/Johannesburg");
    const owner = await import("./owner");
    await owner.sendWelcome(r.id);
    await owner.sendWelcome(r.id); // once only
    await simulate(r.id, "Africa/Johannesburg", 30);

    const kinds = (await prisma.ownerEmail.findMany({ where: { restaurantId: r.id }, orderBy: { sentAt: "asc" } })).map((e) => e.kind);
    expect(kinds.filter((k) => k === "welcome")).toHaveLength(1);
    expect(kinds.filter((k) => k === "trial_ending")).toHaveLength(1);
    expect(kinds.filter((k) => k === "trial_ended")).toHaveLength(1);
    const briefs = kinds.filter((k) => k === "daily_brief").length;
    expect(briefs).toBeGreaterThanOrEqual(5);
    expect(briefs).toBeLessThanOrEqual(8); // 7 trial mornings (+ the start day), nothing after it ended
    expect(cap.sent.length).toBe(kinds.length);
    for (const m of cap.sent) {
      expect(bannedWordsIn(`${m.subject}\n${m.text}`), m.subject).toEqual([]);
      expect(m.text).not.toMatch(/£/);
    }
    const ending = cap.sent.find((m) => /free trial ends/.test(m.subject))!;
    expect(ending.text).toMatch(/nothing is charged/);
    expect(ending.text).toContain("https://app.test/dashboard/billing?r=");
  }, 60_000);

  it("Harbour & Rye adds a card on day 6: weekly summaries keep coming and every approved change gets a confirmation", async () => {
    const { captureTransport, useTransport } = await import("./transport");
    const cap = captureTransport();
    useTransport(cap.transport);
    const r = await venue("Harbour & Rye", "GB", "Europe/London");
    const owner = await import("./owner");
    const published: string[] = [];
    await simulate(r.id, "Europe/London", 30, async (d, now) => {
      if (d === 6) await prisma.restaurant.update({ where: { id: r.id }, data: { billingStatus: "ACTIVE", subscriptionPlan: "PRO", stripeSubscriptionId: "sub_test" } });
      if (d === 10 || d === 20) {
        // An approved change KOB published and read back.
        const a = await prisma.osAction.create({
          data: { restaurantId: r.id, actionType: "gbp.review.reply", title: `Reply to Guest ${d}'s review`, status: "VERIFIED", verifiedAt: now, connector: "GBP" },
        });
        published.push(a.id);
        await owner.sendPublished(a.id);
        await owner.sendPublished(a.id); // once only
      }
    });
    const rows = await prisma.ownerEmail.findMany({ where: { restaurantId: r.id } });
    const count = (k: string) => rows.filter((e) => e.kind === k).length;
    expect(count("weekly_summary")).toBe(4);
    expect(count("trial_ending")).toBe(1);
    expect(count("trial_ended")).toBe(0);
    expect(count("published")).toBe(2);
    expect(count("daily_brief")).toBeGreaterThanOrEqual(15);
    const done = cap.sent.filter((m) => m.subject.startsWith("Done:"));
    expect(done.map((m) => m.text.includes(`/app/actions/${published[0]}`) || m.text.includes(`/app/actions/${published[1]}`))).toEqual([true, true]);
  }, 60_000);

  it("without an email provider it records a dry run instead of claiming it sent", async () => {
    const r = await venue("Dry Run Diner", "US", "America/New_York");
    const prev = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    const out = await (await import("./owner")).sendWelcome(r.id);
    if (prev) process.env.RESEND_API_KEY = prev;
    expect(out).toMatchObject({ sent: 0, dryRun: 1 });
    expect((await prisma.ownerEmail.findFirstOrThrow({ where: { restaurantId: r.id } })).status).toBe("DRY_RUN");
  });
});
