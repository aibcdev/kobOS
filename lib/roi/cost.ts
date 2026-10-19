import { prisma } from "@/lib/db/prisma";

/** T-93: what serving a restaurant cost KOB over a window, from UsageEvent. Internal only; never shown to owners. */

export type WindowCost = { costMicros: bigint; events: number; byKind: Record<string, bigint> };

export async function costBetween(restaurantId: string, start: Date, end: Date): Promise<WindowCost> {
  const groups = await prisma.usageEvent.groupBy({
    by: ["kind"],
    where: { restaurantId, occurredAt: { gte: start, lt: end } },
    _sum: { costMicros: true },
    _count: { _all: true },
  });
  const byKind: Record<string, bigint> = {};
  let costMicros = BigInt(0);
  let events = 0;
  for (const g of groups) {
    const sum = g._sum.costMicros ?? BigInt(0);
    byKind[g.kind] = sum;
    costMicros += sum;
    events += g._count._all;
  }
  return { costMicros, events, byKind };
}

/** Restaurants with metered usage since `since`: their weeks get closed even if they don't get the email. */
export async function usageRestaurants(since: Date): Promise<{ id: string; timezone: string }[]> {
  const ids = await prisma.usageEvent.findMany({ where: { occurredAt: { gte: since } }, distinct: ["restaurantId"], select: { restaurantId: true } });
  if (!ids.length) return [];
  return prisma.restaurant.findMany({ where: { id: { in: ids.map((r) => r.restaurantId) } }, select: { id: true, timezone: true } });
}

export function formatUsdMicros(micros: bigint | number | null | undefined): string {
  const usd = Number(micros ?? 0) / 1_000_000;
  const digits = usd > 0 && usd < 1 ? 4 : 2;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(usd);
}

/** Ops view: one week's saved RoiWeeks with their cost, dearest first. */
export async function fleetCosts(weekStart: string, take = 200) {
  const rows = await prisma.roiWeek.findMany({
    where: { weekStart: new Date(`${weekStart}T00:00:00Z`) },
    orderBy: { costMicros: { sort: "desc", nulls: "last" } },
    take,
    select: { restaurantId: true, costMicros: true, restaurant: { select: { name: true, subscriptionPlan: true } } },
  });
  const total = rows.reduce((s, r) => s + (r.costMicros ?? BigInt(0)), BigInt(0));
  return { weekStart, total, rows };
}
