import type { OverviewMetrics } from "@/lib/dashboard/overview-metrics";
import type { buildDigestSnapshot } from "@/lib/digest/build-snapshot";
import { getPreviewRestaurant } from "@/lib/preview/ui-preview";

export type DigestSnapshot = Awaited<ReturnType<typeof buildDigestSnapshot>>;

export function getPreviewOverviewMetrics(): OverviewMetrics {
  return {
    onlineSalesDisplay: "—",
    onlineSalesHint: "Preview — connect your site snippet after setup.",
    trafficChangePct: 18,
    trafficEventsThisWeek: 0,
    trafficEventsPrevWeek: 0,
    conversionsThisWeek: 0,
    visibilityScore: 82,
    visibilityHint: "Preview — add keywords in Settings when the backend is live.",
    visualHealthScore: 71,
    visualHealthHint: "Preview sample — food photography is a growth lever",
    reviewsThisWeek: 14,
    reviewsAvgThisWeek: 4.8,
    reviewsHint: "Preview — sync reviews in Reviews workspace",
    appDownloadsDisplay: "—",
    appDownloadsHint: "Preview — mobile tab shows the full flow with data.",
  };
}

export function getPreviewDigestSnapshot(): DigestSnapshot {
  const r = getPreviewRestaurant();
  return {
    generatedAt: new Date().toISOString(),
    restaurant: {
      id: r.id,
      name: r.name,
      slug: r.slug,
      city: r.city,
      state: r.state,
    },
    windowDays: 7,
    insightsByStatus: {},
    recommendationsByType: {},
    topRecommendations: [],
    openInsights: [],
  };
}
