import type { SalesSnapshotSource } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

/** Seed 14 days of demo sales when sample mode is on and no live POS data. */
export async function ensureSampleSalesData(restaurantId: string): Promise<void> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { useSampleData: true },
  });
  if (!restaurant?.useSampleData) return;

  const existing = await prisma.salesSnapshot.count({
    where: { restaurantId, source: "SAMPLE" },
  });
  if (existing >= 7) return;

  const days: { date: Date; revenueCents: number; orderCount: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const base = 18000 + (i % 5) * 1200;
    days.push({ date, revenueCents: base + Math.round(Math.random() * 4000), orderCount: 12 + (i % 4) });
  }

  for (const row of days) {
    await prisma.salesSnapshot.upsert({
      where: {
        restaurantId_date_source: {
          restaurantId,
          date: row.date,
          source: "SAMPLE" as SalesSnapshotSource,
        },
      },
      create: {
        restaurantId,
        date: row.date,
        revenueCents: row.revenueCents,
        orderCount: row.orderCount,
        source: "SAMPLE",
      },
      update: {},
    });
  }
}
