import { prisma } from "@/lib/db/prisma";
import type { DataContract } from "@/lib/hub/manifest";
import { sourceRefFromRow, type SourceRef } from "@/lib/hub/source-ref";
import { standardMinutes } from "@/lib/roi/standard-minutes";

/**
 * Spec 2 Phase 9. Each ROI metric is a sum over stored rows, and every row carries the SourceRef it came from, so any
 * headline number can be clicked through to the orders, bookings or KOB actions that make it up. Nothing is
 * estimated except time saved, which uses the published standard minutes.
 */

export type RoiUnit = "money" | "count" | "minutes";

export const METRIC_KEYS = ["net_sales", "delivery_sales", "returning_guests", "bookings", "kob_actions", "time_saved"] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

export type MetricWindow = { restaurantId: string; start: Date; end: Date; currency: string };

export type EvidenceRow = {
  /** Stable per row (order id, booking id, action id) for keys and reconciliation. */
  id: string;
  value: number;
  label: string;
  at: Date;
  ref: SourceRef;
};

type MetricSpec = {
  label: string;
  unit: RoiUnit;
  /** Data this metric reads; null for KOB's own work (always available). OFF when nothing supplies any of these. */
  contracts: DataContract[] | null;
  /** Owner-facing one-liner under the number. */
  explain: string;
  rows(w: MetricWindow): Promise<EvidenceRow[]>;
};

const PAID = ["COMPLETED", "REFUNDED"];

type OrderRow = {
  id: string;
  channel: string;
  placedAt: Date;
  totalMinor: number;
  refundedMinor: number;
  guestId: string | null;
  sourceKind: string;
  sourceProvider: string;
  sourceExternalId: string;
  sourceImportJobId: string | null;
};

async function importedAt(ids: (string | null)[]): Promise<Map<string, Date>> {
  const unique = [...new Set(ids.filter((x): x is string => Boolean(x)))];
  if (!unique.length) return new Map();
  const jobs = await prisma.importJob.findMany({ where: { id: { in: unique } }, select: { id: true, createdAt: true } });
  return new Map(jobs.map((j) => [j.id, j.createdAt]));
}

function refFor(row: Omit<OrderRow, "id" | "channel" | "placedAt" | "totalMinor" | "refundedMinor" | "guestId">, noun: string, occurredAt: Date, imports: Map<string, Date>): SourceRef {
  return { ...sourceRefFromRow(row), noun, occurredAt, importedAt: row.sourceImportJobId ? (imports.get(row.sourceImportJobId) ?? null) : null };
}

const CHANNEL_NOUN: Record<string, string> = { DELIVERY: "delivery order", TAKEAWAY: "takeaway order", DINE_IN: "dine-in order", ONLINE: "online order" };

async function paidOrders(w: MetricWindow, extra: { channel?: string } = {}): Promise<OrderRow[]> {
  return prisma.order.findMany({
    where: { restaurantId: w.restaurantId, status: { in: PAID }, currency: w.currency, placedAt: { gte: w.start, lt: w.end }, ...extra },
    select: {
      id: true,
      channel: true,
      placedAt: true,
      totalMinor: true,
      refundedMinor: true,
      guestId: true,
      sourceKind: true,
      sourceProvider: true,
      sourceExternalId: true,
      sourceImportJobId: true,
    },
    orderBy: { placedAt: "asc" },
  });
}

async function orderRows(w: MetricWindow, extra: { channel?: string } = {}): Promise<EvidenceRow[]> {
  const orders = await paidOrders(w, extra);
  const imports = await importedAt(orders.map((o) => o.sourceImportJobId));
  return orders.map((o) => ({
    id: o.id,
    value: o.totalMinor - o.refundedMinor,
    label: o.refundedMinor > 0 ? `${CHANNEL_NOUN[o.channel] ?? "Order"} (refund netted)` : (CHANNEL_NOUN[o.channel] ?? "Order"),
    at: o.placedAt,
    ref: refFor(o, "order", o.placedAt, imports),
  }));
}

async function returningGuestRows(w: MetricWindow): Promise<EvidenceRow[]> {
  const orders = (await paidOrders(w)).filter((o) => o.guestId && o.totalMinor > 0);
  const firstThisWeek = new Map<string, OrderRow>();
  for (const o of orders) if (!firstThisWeek.has(o.guestId!)) firstThisWeek.set(o.guestId!, o);
  if (!firstThisWeek.size) return [];
  const earlier = await prisma.order.findMany({
    where: { restaurantId: w.restaurantId, guestId: { in: [...firstThisWeek.keys()] }, status: { in: PAID }, totalMinor: { gt: 0 }, placedAt: { lt: w.start } },
    select: { guestId: true },
    distinct: ["guestId"],
  });
  const returning = new Set(earlier.map((e) => e.guestId!));
  const guests = await prisma.guest.findMany({ where: { id: { in: [...returning] } }, select: { id: true, displayName: true } });
  const names = new Map(guests.map((g) => [g.id, g.displayName]));
  const picked = [...firstThisWeek.values()].filter((o) => returning.has(o.guestId!));
  const imports = await importedAt(picked.map((o) => o.sourceImportJobId));
  return picked.map((o) => ({
    id: o.guestId!,
    value: 1,
    label: names.get(o.guestId!) ? `${names.get(o.guestId!)} came back` : "A returning guest",
    at: o.placedAt,
    ref: refFor(o, "order", o.placedAt, imports),
  }));
}

async function bookingRows(w: MetricWindow): Promise<EvidenceRow[]> {
  const rows = await prisma.booking.findMany({
    where: { restaurantId: w.restaurantId, startsAt: { gte: w.start, lt: w.end }, status: { notIn: ["CANCELLED"] } },
    select: { id: true, startsAt: true, partySize: true, status: true, sourceKind: true, sourceProvider: true, sourceExternalId: true, sourceImportJobId: true },
    orderBy: { startsAt: "asc" },
  });
  const imports = await importedAt(rows.map((r) => r.sourceImportJobId));
  return rows.map((b) => ({
    id: b.id,
    value: 1,
    label: `Table for ${b.partySize}${b.status === "NO_SHOW" ? " (no-show)" : ""}`,
    at: b.startsAt,
    ref: refFor(b, "booking", b.startsAt, imports),
  }));
}

async function verifiedActions(w: MetricWindow) {
  return prisma.osAction.findMany({
    where: { restaurantId: w.restaurantId, status: "VERIFIED", verifiedAt: { gte: w.start, lt: w.end } },
    select: { id: true, actionType: true, connector: true, title: true, ownerFacingSummary: true, verifiedAt: true },
    orderBy: { verifiedAt: "asc" },
  });
}

type ActionRow = Awaited<ReturnType<typeof verifiedActions>>[number];

function actionRef(a: ActionRow): SourceRef {
  return { kind: "API", provider: a.connector ?? "KOB", externalId: a.id, noun: "action", occurredAt: a.verifiedAt };
}

export const METRICS: Record<MetricKey, MetricSpec> = {
  net_sales: {
    label: "Sales",
    unit: "money",
    contracts: ["sales", "delivery_sales"],
    explain: "Paid orders, refunds taken off.",
    rows: (w) => orderRows(w),
  },
  delivery_sales: {
    label: "Delivery-app sales",
    unit: "money",
    contracts: ["delivery_sales"],
    explain: "Orders that came through delivery apps.",
    rows: (w) => orderRows(w, { channel: "DELIVERY" }),
  },
  returning_guests: {
    label: "Returning guests",
    unit: "count",
    contracts: ["guests"],
    explain: "Guests who ordered this week and had ordered before.",
    rows: returningGuestRows,
  },
  bookings: {
    label: "Bookings",
    unit: "count",
    contracts: ["bookings"],
    explain: "Tables booked for this week, cancellations left out.",
    rows: bookingRows,
  },
  kob_actions: {
    label: "Jobs KOB did",
    unit: "count",
    contracts: null,
    explain: "Changes KOB made and checked went live.",
    rows: async (w) =>
      (await verifiedActions(w)).map((a) => ({ id: a.id, value: 1, label: a.ownerFacingSummary || a.title, at: a.verifiedAt!, ref: actionRef(a) })),
  },
  time_saved: {
    label: "Time saved",
    unit: "minutes",
    contracts: null,
    explain: "Estimated with KOB's standard minutes for each job.",
    rows: async (w) =>
      (await verifiedActions(w)).flatMap((a) => {
        const minutes = standardMinutes(a.actionType);
        return minutes ? [{ id: a.id, value: minutes, label: a.ownerFacingSummary || a.title, at: a.verifiedAt!, ref: actionRef(a) }] : [];
      }),
  },
};

/** The only way rows become a number: rows without a usable SourceRef are dropped, never guessed at. */
export function sumRows(rows: EvidenceRow[]): { value: number; count: number } {
  const usable = rows.filter((r) => r.ref?.provider && r.ref.externalId && Number.isFinite(r.value));
  return { value: usable.reduce((s, r) => s + r.value, 0), count: usable.length };
}

export function isMetricKey(key: string): key is MetricKey {
  return (METRIC_KEYS as readonly string[]).includes(key);
}
