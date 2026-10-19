import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { describeDb, seedRestaurant } from "@/tests/helpers/db";
import { addDays, isWeekStart, lastCompletedWeek, weekBounds, weekStartOf } from "@/lib/roi/ledger";
import { sumRows, type EvidenceRow } from "@/lib/roi/metrics";
import { STANDARD_MINUTES, standardMinutes } from "@/lib/roi/standard-minutes";
import { ACTION_TYPES } from "@/lib/agent/action-types";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});

describe("ROI weeks (pure)", () => {
  it("weeks start on the restaurant's local Monday", () => {
    // Sunday 22:30 UTC is already Monday in Sydney, still Sunday (23:30 BST) in London.
    const at = new Date("2026-10-18T22:30:00Z");
    expect(weekStartOf(at, "Europe/London")).toBe("2026-10-12");
    expect(weekStartOf(at, "Australia/Sydney")).toBe("2026-10-19");
    expect(weekStartOf(new Date("2026-10-19T08:30:00Z"), "America/Los_Angeles")).toBe("2026-10-19");
    expect(lastCompletedWeek(new Date("2026-10-19T08:30:00Z"), "Europe/London")).toBe("2026-10-12");
    expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
    expect(isWeekStart("2026-10-12")).toBe(true);
    expect(isWeekStart("2026-10-13")).toBe(false);
    expect(isWeekStart("nope")).toBe(false);
  });

  it("bounds follow the timezone, including the week the clocks change", () => {
    expect(weekBounds("2026-10-12", "Europe/London")).toEqual({ start: new Date("2026-10-11T23:00:00Z"), end: new Date("2026-10-18T23:00:00Z") });
    // UK clocks go back on 25 Oct 2026: that week is 169 hours long.
    const dst = weekBounds("2026-10-19", "Europe/London");
    expect(dst).toEqual({ start: new Date("2026-10-18T23:00:00Z"), end: new Date("2026-10-26T00:00:00Z") });
    expect(weekBounds("2026-10-12", "America/New_York").start).toEqual(new Date("2026-10-12T04:00:00Z"));
  });

  it("only rows with a usable SourceRef are summed", () => {
    const row = (value: number, ref: Partial<EvidenceRow["ref"]> | null): EvidenceRow => ({ id: String(value), value, label: "", at: new Date(), ref: ref as EvidenceRow["ref"] });
    expect(
      sumRows([
        row(100, { kind: "API", provider: "SQUARE", externalId: "a" }),
        row(50, { kind: "API", provider: "SQUARE", externalId: "" }),
        row(25, null),
        row(Number.NaN, { kind: "API", provider: "SQUARE", externalId: "b" }),
        row(-20, { kind: "API", provider: "SQUARE", externalId: "c" }),
      ]),
    ).toEqual({ value: 80, count: 2 });
  });

  it("every action type has standard minutes with a stated basis", () => {
    for (const t of ACTION_TYPES) {
      expect(STANDARD_MINUTES[t].minutes).toBeGreaterThan(0);
      expect(STANDARD_MINUTES[t].basis.length).toBeGreaterThan(10);
    }
    expect(standardMinutes("not.a.type")).toBeNull();
  });
});

describeDb("ROI ledger on Postgres (T-90)", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let ledger: typeof import("@/lib/roi/ledger");
  let restaurantId: string;

  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
    ledger = await import("@/lib/roi/ledger");
    restaurantId = (await seedRestaurant(prisma)).restaurant.id;
    await prisma.restaurant.update({ where: { id: restaurantId }, data: { timezone: "Europe/London", countryCode: "GB" } });
  });
  afterAll(async () => {
    await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    for (const t of ["order", "booking", "guest", "importJob", "osAction", "roiWeek", "integration"] as const) {
      await (prisma[t] as unknown as { deleteMany(a: unknown): Promise<unknown> }).deleteMany({ where: { restaurantId } });
    }
  });

  let n = 0;
  const order = (o: { at: string; total: number; refunded?: number; status?: string; channel?: string; provider?: string; currency?: string; guestId?: string; importJobId?: string }) =>
    prisma.order.create({
      data: {
        restaurantId,
        status: o.status ?? "COMPLETED",
        channel: o.channel ?? "DINE_IN",
        placedAt: new Date(o.at),
        currency: o.currency ?? "GBP",
        totalMinor: o.total,
        refundedMinor: o.refunded ?? 0,
        guestId: o.guestId ?? null,
        sourceKind: o.importJobId ? "FILE_IMPORT" : "API",
        sourceProvider: o.provider ?? "SQUARE",
        sourceExternalId: `ext-${++n}`,
        sourceImportJobId: o.importJobId ?? null,
      },
    });
  const action = (actionType: string, status: "VERIFIED" | "FAILED", verifiedAt: string) =>
    prisma.osAction.create({ data: { restaurantId, actionType, status, title: `Did ${actionType}`, connector: "GBP", verifiedAt: new Date(verifiedAt) } });

  async function seedWeek() {
    const guest = await prisma.guest.create({ data: { restaurantId, displayName: "Sam" } });
    const job = await prisma.importJob.create({
      data: { restaurantId, source: "DELIVEROO_CSV", origin: "UPLOAD", storagePath: "x", fileSha256: "sha", status: "IMPORTED", rowsImported: 1, createdAt: new Date("2026-10-19T09:00:00Z") },
    });
    await order({ at: "2026-10-01T12:00:00Z", total: 1000, guestId: guest.id });
    await order({ at: "2026-10-14T12:00:00Z", total: 2000, guestId: guest.id });
    await order({ at: "2026-10-15T12:00:00Z", total: 1500, refunded: 500, status: "REFUNDED" });
    await order({ at: "2026-10-16T19:00:00Z", total: 3000, channel: "DELIVERY", provider: "DELIVEROO_CSV", importJobId: job.id });
    await order({ at: "2026-10-11T23:30:00Z", total: 700 });
    await order({ at: "2026-10-17T12:00:00Z", total: 999, status: "OPEN" });
    await order({ at: "2026-10-18T23:30:00Z", total: 800 });
    await order({ at: "2026-10-14T12:00:00Z", total: 5000, currency: "USD" });
    const b = { restaurantId, partySize: 4, sourceKind: "API", sourceProvider: "SQUARE" };
    await prisma.booking.create({ data: { ...b, startsAt: new Date("2026-10-17T19:00:00Z"), status: "BOOKED", sourceExternalId: "bk1" } });
    await prisma.booking.create({ data: { ...b, startsAt: new Date("2026-10-17T20:00:00Z"), status: "CANCELLED", sourceExternalId: "bk2" } });
    await action("gbp.review.reply", "VERIFIED", "2026-10-13T10:00:00Z");
    await action("gbp.post.create", "VERIFIED", "2026-10-15T10:00:00Z");
    await action("gbp.post.create", "FAILED", "2026-10-15T11:00:00Z");
    await action("gbp.review.reply", "VERIFIED", "2026-10-05T10:00:00Z");
  }

  it("sums only paid, in-currency rows inside the local week, each with a source", async () => {
    await seedWeek();
    const snap = await ledger.computeWeek(restaurantId, "2026-10-12");
    expect(snap).toMatchObject({ weekStart: "2026-10-12", timezone: "Europe/London", currency: "GBP", standardMinutesVersion: "2026-10" });
    expect(snap.metrics.net_sales).toMatchObject({ state: "LIVE", value: 2000 + 1000 + 3000 + 700, count: 4, unit: "money" });
    expect(snap.metrics.net_sales.sources.sort()).toEqual(["DELIVEROO_CSV", "SQUARE"]);
    expect(snap.metrics.delivery_sales).toMatchObject({ state: "LIVE", value: 3000, count: 1 });
    expect(snap.metrics.returning_guests).toMatchObject({ state: "LIVE", value: 1, count: 1 });
    expect(snap.metrics.bookings).toMatchObject({ state: "LIVE", value: 1 });
    expect(snap.metrics.kob_actions).toMatchObject({ state: "LIVE", value: 2 });
    expect(snap.metrics.time_saved).toMatchObject({ state: "LIVE", value: 4 + 15, unit: "minutes" });

    const { rows } = await ledger.metricRows(restaurantId, "2026-10-12", "delivery_sales");
    expect(rows).toHaveLength(1);
    expect(rows[0].ref).toMatchObject({ kind: "FILE_IMPORT", provider: "DELIVEROO_CSV", noun: "order", importedAt: new Date("2026-10-19T09:00:00Z") });
    const returning = await ledger.metricRows(restaurantId, "2026-10-12", "returning_guests");
    expect(returning.rows[0].label).toBe("Sam came back");
  });

  it("metrics with no data source are OFF and say what to connect; KOB's own work is always on", async () => {
    const snap = await ledger.computeWeek(restaurantId, "2026-10-12");
    expect(snap.metrics.net_sales).toMatchObject({ state: "OFF", value: null, connect: ["SQUARE", "EPOS_NOW", "ZETTLE"] });
    expect(snap.metrics.delivery_sales).toMatchObject({ state: "OFF", connect: ["DELIVERY_CSV"] });
    expect(snap.metrics.bookings).toMatchObject({ state: "OFF", connect: ["SQUARE", "RESDIARY"] });
    expect(snap.metrics.kob_actions).toMatchObject({ state: "LIVE", value: 0 });
    expect(snap.metrics.time_saved).toMatchObject({ state: "LIVE", value: 0 });

    await prisma.importJob.create({ data: { restaurantId, source: "DELIVEROO_CSV", origin: "UPLOAD", storagePath: "x", fileSha256: "s2", status: "IMPORTED", rowsImported: 4 } });
    const fed = await ledger.computeWeek(restaurantId, "2026-10-12");
    expect(fed.metrics.delivery_sales).toMatchObject({ state: "LIVE", value: 0 });
    expect(fed.metrics.net_sales).toMatchObject({ state: "LIVE", value: 0 });
  });

  it("saveWeek snapshots once per restaurant-week and recomputes in place", async () => {
    await seedWeek();
    const first = await ledger.saveWeek(restaurantId, "2026-10-12", new Date("2026-10-19T07:30:00Z"));
    await order({ at: "2026-10-16T12:00:00Z", total: 100 });
    const again = await ledger.saveWeek(restaurantId, "2026-10-12");
    expect(again.id).toBe(first.id);
    expect(await prisma.roiWeek.count({ where: { restaurantId } })).toBe(1);
    expect(ledger.snapshotOf(again).metrics.net_sales.value).toBe(6800);
    expect(ledger.snapshotOf(first).weekStart).toBe("2026-10-12");
  });
});
