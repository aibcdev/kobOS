import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { describeDb } from "@/tests/helpers/db";
import { nextLocalEvent, restaurantDates } from "@/lib/locale/holidays";
import { setMenuPrice, spendPerHead } from "@/lib/venue/nights";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});
vi.mock("@/lib/ai/gemini-config", () => ({
  isGeminiConfigured: () => false,
  geminiTextCompletion: async () => ({ ok: false, error: "off" }),
  geminiJsonCompletion: async () => ({ ok: false, error: "off" }),
}));

describe("local dates and prices", () => {
  it("South Africa plans around Heritage Day, not Halloween; the UK gets Halloween", () => {
    const za = restaurantDates("ZA", 2026).map((e) => e.key);
    expect(za).toContain("heritage_day");
    expect(za).not.toContain("halloween");
    expect(restaurantDates("GB", 2026).map((e) => e.key)).toContain("halloween");
    expect(nextLocalEvent("ZA", "2026-09-10")).toMatchObject({ key: "heritage_day", date: "2026-09-24", daysAway: 14 });
    expect(restaurantDates("US", 2026).find((e) => e.key === "thanksgiving")?.date).toBe("2026-11-26");
  });

  it("sizes a set menu to the room", () => {
    expect(setMenuPrice(spendPerHead("R400–500"))).toBe(240);
    expect(setMenuPrice(spendPerHead("£35-45"))).toBe(21);
    expect(setMenuPrice(spendPerHead(null))).toBeNull();
  });
});

describeDb("30 mornings: the brief and offers fit each venue", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  const ids: string[] = [];
  const START = Date.parse("2026-09-10T04:00:00Z"); // 06:00 in Cape Town, 05:00 in Bristol

  async function venue(name: string, country: string, tz: string, locale: string, pricePoint: string) {
    const r = await prisma.restaurant.create({
      data: { name, slug: `${name.toLowerCase().replace(/\W+/g, "-")}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, countryCode: country, timezone: tz, locale, city: country === "ZA" ? "Cape Town" : "Bristol" },
    });
    ids.push(r.id);
    await prisma.osFact.create({ data: { restaurantId: r.id, key: "price_point", valueJson: { text: pricePoint }, source: "owner", lastUpdatedAt: new Date(START) } });
    const { setNights } = await import("@/lib/venue/nights");
    await setNights(r.id, "quiet", ["TUE", "WED"], new Date(START));
    await setNights(r.id, "busy", ["FRI"], new Date(START));
    const { saveHouseRule } = await import("@/lib/kob/talk/restaurant-facts");
    await saveHouseRule(r.id, "Never discount Fridays", null);
    return r;
  }

  async function run(restaurantId: string) {
    const { ensureTodayBrief } = await import("@/lib/chief-of-staff/ensure-today-brief");
    const { generateDailyRecommendationsForRestaurant } = await import("@/lib/demand-engine/generate-daily-recommendations");
    const days: { titles: string[]; pending: number }[] = [];
    for (let d = 0; d < 30; d++) {
      const now = new Date(START + d * 86_400_000);
      // A guest review every third day; the owner deals with yesterday's list.
      if (d % 3 === 0)
        await prisma.customerReview.create({
          data: { restaurantId, source: "OTHER", reviewerName: `Guest ${d}`, rating: d % 6 === 0 ? 2 : 5, body: d % 6 === 0 ? "Slow service tonight." : "Lovely meal.", reviewedAt: now },
        });
      await prisma.customerReview.updateMany({ where: { restaurantId, reviewedAt: { lt: new Date(now.getTime() - 86_400_000) } }, data: { replied: true } });
      await generateDailyRecommendationsForRestaurant(restaurantId, { now });
      const brief = await ensureTodayBrief(restaurantId, true, now);
      // Same morning again: nothing new.
      const before = await prisma.chiefOfStaffTask.count({ where: { restaurantId } });
      await ensureTodayBrief(restaurantId, true, now);
      expect(await prisma.chiefOfStaffTask.count({ where: { restaurantId } })).toBe(before);
      days.push({ titles: brief.tasks.filter((t) => t.status === "PENDING").map((t) => t.title), pending: brief.tasks.length });
      // The owner clears holiday tasks they've seen; offers they don't take expire.
      await prisma.demandRecommendation.updateMany({ where: { restaurantId, status: "PENDING", expiresAt: { lt: now } }, data: { status: "EXPIRED" } });
    }
    const tasks = await prisma.chiefOfStaffTask.findMany({ where: { restaurantId } });
    const offers = await prisma.demandRecommendation.findMany({ where: { restaurantId } });
    return { days, tasks, offers };
  }

  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
  });
  afterAll(async () => {
    await prisma.restaurant.deleteMany({ where: { id: { in: ids } } });
  });

  it("Godfather (Cape Town): rand offers on quiet nights only, SA dates, a brief that moves", async () => {
    const r = await venue("Godfather", "ZA", "Africa/Johannesburg", "en-ZA", "R400–500");
    const { days, tasks, offers } = await run(r.id);
    const text = JSON.stringify([tasks.map((t) => [t.title, t.detail]), offers.map((o) => [o.title, o.reason, o.offer])]);

    expect(offers.length).toBeGreaterThan(0);
    expect(text).not.toMatch(/£|GBP|Halloween|Bonfire/);
    expect(tasks.some((t) => /Heritage Day/.test(t.title))).toBe(true);
    for (const o of offers) {
      const offer = o.offer as { currency?: string; days?: string[]; discountValue?: number };
      expect(offer.currency).toBe("ZAR");
      expect(offer.days?.every((d) => ["TUE", "WED"].includes(d))).toBe(true);
      expect(offer.days).not.toContain("FRI");
    }
    expect(offers.some((o) => (o.offer as { discountValue?: number }).discountValue === 240)).toBe(true);

    // Stable: never a pile-up of open tasks.
    expect(Math.max(...days.map((d) => d.pending))).toBeLessThanOrEqual(8);
    // Moves: on average no more than half of a day's tasks were also there a week earlier.
    const repeats = days.slice(7).map((d, i) => {
      const lastWeek = new Set(days[i].titles);
      return d.titles.length ? d.titles.filter((t) => lastWeek.has(t)).length / d.titles.length : 0;
    });
    expect(repeats.reduce((a, b) => a + b, 0) / repeats.length).toBeLessThanOrEqual(0.5);
  });

  it("Harbour & Rye (Bristol): pound offers, never a Friday discount", async () => {
    const r = await venue("Harbour & Rye", "GB", "Europe/London", "en-GB", "£35–45");
    const { offers, tasks } = await run(r.id);
    expect(offers.length).toBeGreaterThan(0);
    for (const o of offers) {
      const offer = o.offer as { currency?: string; days?: string[] };
      expect(offer.currency).toBe("GBP");
      expect(offer.days).not.toContain("FRI");
    }
    expect(JSON.stringify(tasks.map((t) => t.title))).not.toMatch(/Heritage Day/);
  });
});
