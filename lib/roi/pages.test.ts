import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { describeDb, seedRestaurant } from "@/tests/helpers/db";
import { formatMetric, formatMinutes, formatValue, weekLabel } from "@/lib/roi/format";
import { reconcile, type StoredMetric } from "@/lib/roi/ledger";
import { METRIC_KEYS, type EvidenceRow } from "@/lib/roi/metrics";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});

const row = (id: string, value: number): EvidenceRow => ({ id, value, label: id, at: new Date(), ref: { kind: "API", provider: "SQUARE", externalId: id } });
const live = (value: number, count: number): StoredMetric => ({ state: "LIVE", value, unit: "money", count, sources: ["SQUARE"], connect: [] });

describe("ROI formatting and reconciliation", () => {
  it("formats money, minutes and counts the same everywhere", () => {
    expect(formatValue(123456, "money", "GBP")).toBe("£1,234.56");
    expect(formatValue(5000, "money", "USD", "en-US")).toBe("$50.00");
    expect(formatValue(1234, "count", "GBP")).toBe("1,234");
    expect(formatMinutes(19)).toBe("19 min");
    expect(formatMinutes(120)).toBe("2 h");
    expect(formatMinutes(79)).toBe("1 h 19 min");
    expect(formatMetric({ state: "OFF", value: null, unit: "money", count: 0, sources: [], connect: ["SQUARE"] }, "GBP")).toBeNull();
    expect(weekLabel("2026-10-12")).toBe("12 – 18 Oct 2026");
    expect(weekLabel("2026-09-28")).toBe("28 Sept – 4 Oct 2026");
  });

  it("reconcile flags a total that moved since the report", () => {
    expect(reconcile(live(300, 2), [row("a", 100), row("b", 200)])).toEqual({ total: 300, count: 2, reported: 300, changed: false });
    expect(reconcile(live(300, 2), [row("a", 100), row("b", 150)])).toMatchObject({ total: 250, reported: 300, changed: true });
    expect(reconcile(live(300, 2), [row("a", 100), row("b", 150), row("c", 50)])).toMatchObject({ total: 300, changed: true });
    expect(reconcile(undefined, [row("a", 1)])).toMatchObject({ reported: null, changed: false });
  });
});

describeDb("ROI pages data on Postgres (T-91)", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let ledger: typeof import("@/lib/roi/ledger");
  let restaurantId: string;

  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
    ledger = await import("@/lib/roi/ledger");
    restaurantId = (await seedRestaurant(prisma)).restaurant.id;
    await prisma.restaurant.update({ where: { id: restaurantId }, data: { timezone: "America/New_York", countryCode: "US" } });
    const base = { restaurantId, currency: "USD", sourceKind: "API", sourceProvider: "CLOVER", channel: "DINE_IN" };
    const guest = await prisma.guest.create({ data: { restaurantId } });
    await prisma.order.create({ data: { ...base, status: "COMPLETED", placedAt: new Date("2026-09-30T18:00:00Z"), totalMinor: 900, sourceExternalId: "o0", guestId: guest.id } });
    await prisma.order.create({ data: { ...base, status: "COMPLETED", placedAt: new Date("2026-10-13T18:00:00Z"), totalMinor: 2500, sourceExternalId: "o1", guestId: guest.id } });
    await prisma.order.create({ data: { ...base, status: "REFUNDED", placedAt: new Date("2026-10-14T18:00:00Z"), totalMinor: 1800, refundedMinor: 1800, sourceExternalId: "o2" } });
    await prisma.order.create({ data: { ...base, status: "COMPLETED", channel: "DELIVERY", placedAt: new Date("2026-10-15T23:00:00Z"), totalMinor: 4100, sourceExternalId: "o3" } });
    await prisma.osAction.create({ data: { restaurantId, actionType: "gbp.hours.special.set", status: "VERIFIED", title: "Set Thanksgiving hours", verifiedAt: new Date("2026-10-14T15:00:00Z") } });
  });
  afterAll(async () => {
    await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
    await prisma.$disconnect();
  });

  it("every saved total equals the sum of its click-through rows", async () => {
    const saved = await ledger.saveWeek(restaurantId, "2026-10-12");
    const snap = ledger.snapshotOf(saved);
    for (const key of METRIC_KEYS) {
      const m = snap.metrics[key];
      const { rows } = await ledger.metricRows(restaurantId, "2026-10-12", key);
      const check = ledger.reconcile(m, rows);
      if (m.state === "LIVE") expect({ key, changed: check.changed, total: check.total }).toEqual({ key, changed: false, total: m.value });
      else expect(rows).toHaveLength(0);
    }
    expect(snap.metrics.net_sales.value).toBe(2500 + 0 + 4100);
    const { rows } = await ledger.metricRows(restaurantId, "2026-10-12", "time_saved");
    expect(rows[0]).toMatchObject({ value: 5, note: "5 min by hand: set holiday or special hours on Google", ref: { provider: "KOB", noun: "action" } });
  });

  it("weekView prefers the saved snapshot; recentWeeks lists saved weeks plus the last completed one", async () => {
    await prisma.order.create({
      data: { restaurantId, currency: "USD", sourceKind: "API", sourceProvider: "CLOVER", status: "COMPLETED", placedAt: new Date("2026-10-16T18:00:00Z"), totalMinor: 100, sourceExternalId: "late" },
    });
    const view = await ledger.weekView(restaurantId, "2026-10-12");
    expect(view.saved).not.toBeNull();
    expect(view.snapshot.metrics.net_sales.value).toBe(6600);
    const { rows } = await ledger.metricRows(restaurantId, "2026-10-12", "net_sales");
    expect(ledger.reconcile(view.snapshot.metrics.net_sales, rows)).toMatchObject({ total: 6700, reported: 6600, changed: true });

    const unsaved = await ledger.weekView(restaurantId, "2026-10-05");
    expect(unsaved.saved).toBeNull();
    expect(await ledger.recentWeeks(restaurantId, "America/New_York", new Date("2026-10-26T14:00:00Z"))).toEqual(["2026-10-19", "2026-10-12"]);
  });
});
