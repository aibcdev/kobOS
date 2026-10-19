import { Prisma, type SalesSnapshotSource } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

const API_SOURCES: Record<string, SalesSnapshotSource> = {
  SQUARE: "SQUARE",
  TOAST: "TOAST",
  EPOS_NOW: "EPOS_NOW",
  ZETTLE: "ZETTLE",
  CLOVER: "CLOVER",
};

/** Which SalesSnapshot bucket an order lands in; null for sources that aren't sales (none yet). */
export function snapshotSourceFor(sourceKind: string, sourceProvider: string): SalesSnapshotSource | null {
  if (sourceKind === "FILE_IMPORT" || sourceKind === "EMAIL_INGEST") return "IMPORT";
  if (sourceKind === "OWNER_ENTERED") return "MANUAL";
  return API_SOURCES[sourceProvider] ?? null;
}

/** YYYY-MM-DD of `at` in the restaurant's timezone. */
export function localDay(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

const DAY_MS = 86_400_000;

type DayRow = { day: Date; sourceKind: string; sourceProvider: string; revenue: bigint; orders: number };

/**
 * Rebuilds SalesSnapshot rows from Order for every local day touched by [from, to]. Revenue is total minus refunds of
 * paid orders (COMPLETED / REFUNDED); open and cancelled orders are not sales. Stand-alone refund rows (total 0, POSes
 * that record a refund as its own transaction) reduce revenue but are not counted as orders. Only sources that have orders are
 * rewritten, so legacy SAMPLE / MANUAL rows and pre-hub provider rows for untouched days are left alone. `alsoClear`
 * covers a source whose last orders were just deleted (undoing an import).
 */
export async function rebuildSalesSnapshots(restaurantId: string, from: Date, to: Date, alsoClear: SalesSnapshotSource[] = []): Promise<number> {
  const { timezone } = await prisma.restaurant.findUniqueOrThrow({ where: { id: restaurantId }, select: { timezone: true } });
  const fromDay = localDay(from, timezone);
  const toDay = localDay(to, timezone);

  const rows = await prisma.$queryRaw<DayRow[]>(Prisma.sql`
    SELECT ("placedAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timezone})::date AS day,
           "sourceKind", "sourceProvider",
           SUM("totalMinor" - "refundedMinor")::bigint AS revenue,
           (COUNT(*) FILTER (WHERE "totalMinor" > 0))::int AS orders
    FROM "Order"
    WHERE "restaurantId" = ${restaurantId}
      AND "status" IN ('COMPLETED', 'REFUNDED')
      AND "placedAt" >= ${new Date(from.getTime() - 2 * DAY_MS)} AND "placedAt" < ${new Date(to.getTime() + 2 * DAY_MS)}
      AND ("placedAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timezone})::date BETWEEN ${fromDay}::date AND ${toDay}::date
    GROUP BY 1, 2, 3`);

  const totals = new Map<string, { date: Date; source: SalesSnapshotSource; revenueCents: number; orderCount: number }>();
  for (const r of rows) {
    const source = snapshotSourceFor(r.sourceKind, r.sourceProvider);
    if (!source) continue;
    const key = `${r.day.toISOString().slice(0, 10)}|${source}`;
    const t = totals.get(key) ?? { date: r.day, source, revenueCents: 0, orderCount: 0 };
    t.revenueCents += Number(r.revenue);
    t.orderCount += r.orders;
    totals.set(key, t);
  }

  const sourcesWithOrders = (
    await prisma.order.findMany({ where: { restaurantId }, distinct: ["sourceKind", "sourceProvider"], select: { sourceKind: true, sourceProvider: true } })
  )
    .map((o) => snapshotSourceFor(o.sourceKind, o.sourceProvider))
    .filter((s): s is SalesSnapshotSource => s !== null);

  await prisma.$transaction([
    prisma.salesSnapshot.deleteMany({
      where: { restaurantId, source: { in: [...new Set([...sourcesWithOrders, ...alsoClear])] }, date: { gte: new Date(fromDay), lte: new Date(toDay) } },
    }),
    prisma.salesSnapshot.createMany({ data: [...totals.values()].map((t) => ({ restaurantId, ...t })) }),
  ]);
  return totals.size;
}
