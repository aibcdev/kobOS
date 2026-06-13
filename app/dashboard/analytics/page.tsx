import type { Metadata } from "next";
import { TrafficSalesPanel } from "@/components/dashboard/metrics/TrafficSalesPanel";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { getOverviewMetrics } from "@/lib/dashboard/overview-metrics";
import { getSalesMetrics } from "@/lib/dashboard/sales-metrics";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Traffic & Sales · KOB",
  description: "Visitors, orders, and AOV.",
};

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 7);

  const [metrics, sales, byType] = await Promise.all([
    getOverviewMetrics(restaurantId),
    getSalesMetrics(restaurantId),
    prisma.websiteEvent.groupBy({
      by: ["type"],
      where: { restaurantId, createdAt: { gte: since } },
      _count: { id: true },
    }),
  ]);

  const eventBreakdown = byType.map((row) => ({ type: row.type, count: row._count.id }));

  return (
    <div className="mx-auto max-w-5xl px-[var(--spacing-md)] py-10">
      <h1 className="type-title-md">Traffic &amp; Sales</h1>
      <p className="type-body-md mt-2 text-[var(--color-muted)]">Marketing, traffic, and revenue at a glance.</p>
      <div className="mt-8">
        <TrafficSalesPanel
          restaurantId={restaurantId}
          restaurantName={restaurant.name}
          metrics={metrics}
          sales={sales}
          eventBreakdown={eventBreakdown}
        />
      </div>
    </div>
  );
}
