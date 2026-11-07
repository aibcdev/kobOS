import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { describeDb } from "@/tests/helpers/db";
import { countedHosts, fromCountedHost, isBot, utcDay, visitPath, visitSource } from "./visits";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});

const HOSTS = ["trykob.com", "www.trykob.com"];

describe("visitPath", () => {
  it("keeps public pages, trims query and trailing slash", () => {
    expect(visitPath("/")).toBe("/");
    expect(visitPath("/Pricing/?utm_source=x#top")).toBe("/pricing");
    expect(visitPath("/resources/kob-vs-owner-com-which-is-better")).toBe("/resources/kob-vs-owner-com-which-is-better");
  });

  it("collapses per-restaurant pages and drops signed-in areas", () => {
    expect(visitPath("/audit/farmhouse")).toBe("/audit/[slug]");
    expect(visitPath("/audit")).toBe("/audit");
    expect(visitPath("/review/abc/thanks")).toBe("/review/[slug]");
    for (const p of ["/app", "/app/actions/1", "/dashboard/reviews", "/ops/funnel", "/api/visit", "/login"]) {
      expect(visitPath(p), p).toBeNull();
    }
  });

  it("rejects anything that isn't a plain site path", () => {
    for (const p of [undefined, 42, "", "pricing", "//evil.com/x", "/" + "a".repeat(130), "/<script>"]) {
      expect(visitPath(p), String(p)).toBeNull();
    }
  });
});

describe("visitSource", () => {
  const entry = (referrer?: string, utmSource?: string) => visitSource({ entry: true, referrer, utmSource }, HOSTS);

  it("buckets referrers, with utm_source winning", () => {
    expect(entry("https://www.google.co.uk/")).toBe("google");
    expect(entry("https://gemini.google.com/app")).toBe("gemini");
    expect(entry("https://chatgpt.com/")).toBe("chatgpt");
    expect(entry("https://t.co/abc")).toBe("x");
    expect(entry("https://lnkd.in/xyz")).toBe("linkedin");
    expect(entry("https://www.someblog.com/post")).toBe("someblog.com");
    expect(entry("https://www.google.com/", "LinkedIn")).toBe("linkedin");
  });

  it("is direct with no referrer or our own, and internal after the first page", () => {
    expect(entry()).toBe("direct");
    expect(entry("not a url")).toBe("direct");
    expect(entry("https://trykob.com/pricing")).toBe("direct");
    expect(visitSource({ entry: false, referrer: "https://google.com/" }, HOSTS)).toBe("internal");
  });
});

describe("who counts", () => {
  it("skips bots and automated browsers", () => {
    expect(isBot(null)).toBe(true);
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isBot("Mozilla/5.0 ... HeadlessChrome/120.0")).toBe(true);
    expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1")).toBe(false);
  });

  it("counts only beacons from the production host, never previews or localhost", () => {
    expect(countedHosts("https://trykob.com")).toEqual(HOSTS);
    expect(countedHosts("http://localhost:3333", false)).toEqual([]);
    expect(countedHosts("http://localhost:3333", true)).toEqual(["localhost", "www.localhost"]);
    expect(fromCountedHost("https://www.trykob.com", HOSTS)).toBe(true);
    expect(fromCountedHost("https://deploy-preview-66--kob.netlify.app", HOSTS)).toBe(false);
    expect(fromCountedHost(null, HOSTS)).toBe(false);
  });

  it("groups by UTC day", () => {
    expect(utcDay(new Date("2026-11-07T23:59:59-05:00")).toISOString()).toBe("2026-11-08T00:00:00.000Z");
  });
});

describeDb("visit counts and recent activity on Postgres", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let visits: typeof import("./visits");
  let recent: typeof import("@/lib/ops/recent-activity");
  // Far from any date other test files use, since they share the database.
  const now = new Date("2031-11-07T12:00:00Z");
  const marker = "Visits test restaurant";

  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
    visits = await import("./visits");
    recent = await import("@/lib/ops/recent-activity");
    await prisma.siteVisitDay.deleteMany({});
    await prisma.visibilityAudit.deleteMany({ where: { restaurantName: marker } });
  });
  afterAll(async () => {
    await prisma.siteVisitDay.deleteMany({});
    await prisma.visibilityAudit.deleteMany({ where: { restaurantName: marker } });
    await prisma.$disconnect();
  });

  it("adds views and entries into one row per day, page and source", async () => {
    await visits.recordVisit("/pricing", "google", true, now);
    await visits.recordVisit("/pricing", "google", true, now);
    await visits.recordVisit("/pricing", "internal", false, now);
    await visits.recordVisit("/", "direct", true, new Date("2031-11-01T12:00:00Z"));
    const rows = await prisma.siteVisitDay.findMany({ where: { path: "/pricing" }, orderBy: { source: "asc" } });
    expect(rows.map((r) => [r.source, r.views, r.entries])).toEqual([
      ["google", 2, 2],
      ["internal", 1, 0],
    ]);
  });

  it("splits audits by origin and only counts visits inside the window", async () => {
    const audit = (origin: string | null, createdAt: Date) =>
      prisma.visibilityAudit.create({
        data: {
          restaurantName: marker,
          city: "Leeds",
          overallScore: 70,
          seoScore: 70,
          designScore: 70,
          mobileScore: 70,
          conversionScore: 70,
          origin,
          createdAt,
        },
      });
    await audit("outbound", new Date("2031-11-07T06:00:00Z"));
    await audit("outbound", new Date("2031-11-06T18:01:00Z"));
    await audit("visitor", new Date("2031-11-07T09:30:00Z"));
    await audit(null, new Date("2031-11-07T10:00:00Z"));
    await audit("visitor", new Date("2031-11-01T09:00:00Z"));

    const a = await recent.loadRecentActivity(48, now);
    expect(a.audits).toEqual({ visitor: 1, outbound: 2, internal: 0, unknown: 1 });
    expect(a.visitsSinceDay).toBe("2031-11-05");
    expect(a.visits).toMatchObject({ views: 3, entries: 2 });
    expect(a.visits.topSources).toEqual([{ source: "google", entries: 2 }]);
    expect(a.visits.topPages).toEqual([{ path: "/pricing", views: 3 }]);
  });
});
