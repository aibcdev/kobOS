import { prisma } from "@/lib/db/prisma";

export type OverviewMetrics = {
  onlineSalesDisplay: string;
  onlineSalesHint: string;
  trafficChangePct: number | null;
  trafficEventsThisWeek: number;
  trafficEventsPrevWeek: number;
  conversionsThisWeek: number;
  visibilityScore: number | null;
  visibilityHint: string;
  /** Latest DailyScan or heuristic from food photo count. */
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

  const [thisWeek, prevWeek, conversions, kw, latestScan, reviewAgg, foodPhotoCount] = await Promise.all([
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
    prisma.keyword.aggregate({
      where: { restaurantId },
      _avg: { opportunityScore: true, ranking: true },
      _count: { id: true },
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

  let trafficChangePct: number | null = null;
  if (prevWeek === 0 && thisWeek === 0) trafficChangePct = null;
  else if (prevWeek === 0) trafficChangePct = thisWeek > 0 ? 100 : 0;
  else trafficChangePct = Math.round(((thisWeek - prevWeek) / prevWeek) * 100);

  let visibilityScore: number | null = null;
  let visibilityHint = "Add keywords or run the public audit.";
  if (kw._count.id > 0 && kw._avg.opportunityScore != null) {
    const raw = kw._avg.opportunityScore;
    visibilityScore = Math.min(100, Math.max(0, Math.round(raw <= 1 ? raw * 100 : raw)));
    visibilityHint = `${kw._count.id} tracked keywords`;
  } else if (kw._count.id > 0) {
    const r = kw._avg.ranking;
    if (r != null) {
      visibilityScore = Math.min(100, Math.max(20, 100 - Math.min(80, Math.round(r / 2))));
      visibilityHint = "Estimated from average rank";
    }
  }

  let visualHealthScore: number | null = latestScan?.visualHealthScore ?? null;
  let visualHealthHint = latestScan?.visualHealthScore != null ? "From last Daily Scan" : "Heuristic from food assets on file";
  if (visualHealthScore == null) {
    visualHealthScore = Math.min(100, 48 + Math.min(40, foodPhotoCount * 6));
    if (foodPhotoCount === 0) {
      visualHealthHint = "Add food photos in Brand — stronger visual signal for guests";
    }
  }

  const reviewsThisWeek = reviewAgg._count.id;
  const reviewsAvgThisWeek =
    reviewAgg._avg.rating != null ? Math.round(reviewAgg._avg.rating * 10) / 10 : null;
  const reviewsHint =
    reviewsThisWeek === 0
      ? "No reviews logged this week"
      : reviewsAvgThisWeek != null
        ? `Avg ${reviewsAvgThisWeek}★ in window`
        : "Recent review activity";

  return {
    onlineSalesDisplay: "—",
    onlineSalesHint: "Direct reservation & visit signals when site + GBP are connected",
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
