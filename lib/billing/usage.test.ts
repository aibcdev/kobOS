import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { describeDb, seedRestaurant } from "@/tests/helpers/db";
import { reportWeeklyUsage } from "@/lib/billing/meters";
import { llmCostMicros } from "@/lib/billing/usage";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});

describe("usage pricing (T-93)", () => {
  it("prices tokens in USD micros, longest model match first, unknown models at the dearest rate", () => {
    expect(llmCostMicros("gemini-2.5-flash", 1_000_000, 0)).toBe(300_000);
    expect(llmCostMicros("gemini-2.5-flash", 1000, 500)).toBe(1550);
    expect(llmCostMicros("gemini-2.5-flash-lite", 1000, 500)).toBe(300);
    expect(llmCostMicros("gemini-2.5-flash-preview-09-2025", 1000, 0)).toBe(300);
    expect(llmCostMicros("some-new-model", 1000, 1000)).toBe(11_250);
    expect(llmCostMicros("gemini-2.0-flash", 3, 0)).toBe(1);
    expect(llmCostMicros("gemini-2.5-flash", -5, -5)).toBe(0);
  });

  it("Stripe meters are a no-op until a usage-priced add-on ships", async () => {
    expect(await reportWeeklyUsage({ restaurantId: "r", weekStart: "2026-10-12", costMicros: BigInt(5) })).toEqual({ reported: false, reason: "meters_disabled" });
  });
});

describeDb("cost accounting on Postgres (T-93)", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let usage: typeof import("@/lib/billing/usage");
  let cost: typeof import("@/lib/roi/cost");
  let ledger: typeof import("@/lib/roi/ledger");
  let restaurantId: string;

  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
    usage = await import("@/lib/billing/usage");
    cost = await import("@/lib/roi/cost");
    ledger = await import("@/lib/roi/ledger");
    restaurantId = (await seedRestaurant(prisma)).restaurant.id;
    await prisma.restaurant.update({ where: { id: restaurantId }, data: { timezone: "America/New_York", countryCode: "US" } });
  });

  afterAll(async () => {
    await prisma.restaurant.delete({ where: { id: restaurantId } });
  });

  it("records LLM and image usage, skips empty calls, and never throws", async () => {
    await usage.recordLlmUsage(restaurantId, "gemini-2.5-flash", { inputTokens: 1000, outputTokens: 500 }, "talk");
    await usage.recordLlmUsage(restaurantId, "gemini-2.5-flash", { inputTokens: 0, outputTokens: 0 }, "talk");
    await usage.recordLlmUsage(null, "gemini-2.5-flash", { inputTokens: 10, outputTokens: 10 }, "talk");
    await usage.recordImageUsage(restaurantId, "gemini-image", "content:INSTAGRAM_CAPTION");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(usage.recordLlmUsage("no-such-restaurant", "gemini-2.5-flash", { inputTokens: 1, outputTokens: 1 }, "chat")).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();

    const rows = await prisma.usageEvent.findMany({ where: { restaurantId }, orderBy: { kind: "asc" } });
    expect(rows.map((r) => [r.kind, r.source, Number(r.costMicros), r.priceVersion])).toEqual([
      ["IMAGE", "content:INSTAGRAM_CAPTION", 39_000, usage.PRICE_VERSION],
      ["LLM", "talk", 1550, usage.PRICE_VERSION],
    ]);
  });

  it("sums cost over the restaurant's local week and stores it on RoiWeek", async () => {
    await prisma.usageEvent.deleteMany({ where: { restaurantId } });
    const ev = (iso: string, micros: number, kind = "LLM") =>
      prisma.usageEvent.create({ data: { restaurantId, kind, provider: "GEMINI", costMicros: BigInt(micros), priceVersion: "t", source: "t", occurredAt: new Date(iso) } });
    await ev("2026-10-12T03:59:00Z", 1); // Sunday 23:59 New York: previous week
    await ev("2026-10-12T04:00:00Z", 100); // Monday 00:00 New York
    await ev("2026-10-18T12:00:00Z", 250, "IMAGE");
    await ev("2026-10-19T03:59:00Z", 50); // Sunday 23:59 New York: still this week
    await ev("2026-10-19T04:00:00Z", 7); // next week

    const { start, end } = ledger.weekBounds("2026-10-12", "America/New_York");
    expect(await cost.costBetween(restaurantId, start, end)).toEqual({ costMicros: BigInt(400), events: 3, byKind: { LLM: BigInt(150), IMAGE: BigInt(250) } });

    const row = await ledger.saveWeek(restaurantId, "2026-10-12", new Date("2026-10-19T13:00:00Z"));
    expect(row.costMicros).toBe(BigInt(400));
    expect((await cost.usageRestaurants(new Date("2026-10-10T00:00:00Z"))).map((r) => r.id)).toContain(restaurantId);
    const fleet = await cost.fleetCosts("2026-10-12");
    expect(fleet.rows.find((r) => r.restaurantId === restaurantId)?.costMicros).toBe(BigInt(400));
    expect(cost.formatUsdMicros(BigInt(400))).toBe("$0.0004");
    expect(cost.formatUsdMicros(BigInt(12_340_000))).toBe("$12.34");
  });
});
