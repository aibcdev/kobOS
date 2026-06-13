import { prisma } from "@/lib/db/prisma";
import { ensureSampleSalesData } from "@/lib/dashboard/sample-data";

export type SalesMetrics = {
  revenueCents7d: number;
  orderCount7d: number;
  aovCents: number | null;
  revenueDisplay: string;
  aovDisplay: string;
  source: string;
  daily: { date: string; revenueCents: number; orderCount: number }[];
};

function gbp(cents: number): string {
  return `£${(cents / 100).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export async function getSalesMetrics(restaurantId: string): Promise<SalesMetrics> {
  await ensureSampleSalesData(restaurantId);

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 14);

  const rows = await prisma.salesSnapshot.findMany({
    where: { restaurantId, date: { gte: since } },
    orderBy: { date: "asc" },
  });

  const weekAgo = new Date();
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  const weekRows = rows.filter((r) => r.date >= weekAgo);

  const revenueCents7d = weekRows.reduce((s, r) => s + r.revenueCents, 0);
  const orderCount7d = weekRows.reduce((s, r) => s + r.orderCount, 0);
  const aovCents = orderCount7d > 0 ? Math.round(revenueCents7d / orderCount7d) : null;
  const source = rows[0]?.source ?? "none";

  return {
    revenueCents7d,
    orderCount7d,
    aovCents,
    revenueDisplay: revenueCents7d > 0 ? gbp(revenueCents7d) : "—",
    aovDisplay: aovCents != null ? gbp(aovCents) : "—",
    source,
    daily: rows.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      revenueCents: r.revenueCents,
      orderCount: r.orderCount,
    })),
  };
}
