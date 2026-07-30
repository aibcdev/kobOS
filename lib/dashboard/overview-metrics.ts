import { prisma } from "@/lib/db/prisma";
import { getSalesMetrics } from "@/lib/dashboard/sales-metrics";

export type OverviewMetrics = {
  onlineSalesDisplay: string;
  onlineSalesHint: string;
  trafficChangePct: number | null;
  trafficEventsThisWeek: number;
  trafficEventsPrevWeek: number;
  conversionsThisWeek: number;
  visibilityScore: number | null;
  visibilityHint: string;
  /** Latest DailyScan only — null when nothing has actually been scanned. */
  visualHealthScore: number | null;
  visualHealthHint: string;
  reviewsThisWeek: number;
  reviewsAvgThisWeek: number | null;
  reviewsHint: string;
  appDownloadsDisplay: string;
  appDownloadsHint: string;
};

/** Rolling 7-day vs prior 7-day website events + keyword-based visibility hint. */
export async function getOverviewMetrics(restaurantId: string): Promise<OverviewMetrics> {
  const thisPeriodStart = new Date();
  thisPeriodStart.setUTCDate(thisPeriodStart.getUTCDate() - 7);
  const prevPeriodStart = new Date(thisPeriodStart);
  prevPeriodStart.setUTCDate(prevPeriodStart.getUTCDate() - 7);

  const [thisWeek, prevWeek, conversions, latestAudit, latestScan, reviewAgg, foodPhotoCount] = await Promise.all([
    prisma.websiteEvent.count({
      where: { restaurantId, createdAt: { gte: thisPeriodStart } },
    }),
    prisma.websiteEvent.count({
      where: {
        restaurantId,
        createdAt: { gte: prevPeriodStart, lt: thisPeriodStart },
      },
    }),
    prisma.websiteEvent.count({
      where: {
        restaurantId,
        type: "CTA_CONVERT",
        createdAt: { gte: thisPeriodStart },
      },
    }),
    prisma.visibilityAudit.findFirst({
      where: { restaurantId },
      orderBy: { updatedAt: "desc" },
      select: { overallScore: true },
    }),
    prisma.dailyScan.findFirst({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      select: { visualHealthScore: true },
    }),
    prisma.customerReview.aggregate({
      where: { restaurantId, reviewedAt: { gte: thisPeriodStart } },
      _count: { id: true },
      _avg: { rating: true },
    }),
    prisma.asset.count({
      where: { restaurantId, type: "FOOD_PHOTO" },
    }),
  ]);

  // A jump from a zero baseline isn't a percentage change — show the raw counts instead.
  const trafficChangePct =
    prevWeek === 0 ? null : Math.round(((thisWeek - prevWeek) / prevWeek) * 100);

  const visibilityScore = latestAudit?.overallScore ?? null;
  const visibilityHint =
    visibilityScore != null ? "From your latest audit" : "Run an audit to score your visibility.";

  const visualHealthScore = latestScan?.visualHealthScore ?? null;
  const visualHealthHint =
    visualHealthScore != null
      ? "From last Daily Scan"
      : foodPhotoCount === 0
        ? "Add food photos in Brand — stronger visual signal for guests"
        : "Not scanned yet";

  const reviewsThisWeek = reviewAgg._count.id;
  const reviewsAvgThisWeek =
    reviewAgg._avg.rating != null ? Math.round(reviewAgg._avg.rating * 10) / 10 : null;
  const reviewsHint =
    reviewsThisWeek === 0
      ? "No reviews logged this week"
      : reviewsAvgThisWeek != null
        ? `Avg ${reviewsAvgThisWeek}★ in window`
        : "Recent review activity";

  const sales = await getSalesMetrics(restaurantId);

  return {
    onlineSalesDisplay: sales.revenueDisplay,
    onlineSalesHint:
      sales.revenueCents7d > 0
        ? `${sales.orderCount7d} orders · ${sales.source === "SAMPLE" ? "sample data" : sales.source}`
        : "Connect Square in Workspace for live sales",
    trafficChangePct,
    trafficEventsThisWeek: thisWeek,
    trafficEventsPrevWeek: prevWeek,
    conversionsThisWeek: conversions,
    visibilityScore,
    visibilityHint,
    visualHealthScore,
    visualHealthHint,
    reviewsThisWeek,
    reviewsAvgThisWeek,
    reviewsHint,
    appDownloadsDisplay: "—",
    appDownloadsHint: "Branded app builder (roadmap)",
  };
}
