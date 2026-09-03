import type { OverviewMetrics } from "@/lib/dashboard/overview-metrics";
import type { SalesMetrics } from "@/lib/dashboard/sales-metrics";
import type { buildDigestSnapshot } from "@/lib/digest/build-snapshot";
import { getPreviewChiefOfStaffBrief } from "@/lib/preview/chief-of-staff-preview";
import { getPreviewRestaurant } from "@/lib/preview/ui-preview";

export { getPreviewChiefOfStaffBrief };

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

/** Sample 14-day sales curve; totals and AOV are derived, not typed in by hand. */
export function getPreviewSalesMetrics(): SalesMetrics {
  const daily: SalesMetrics["daily"] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const dow = d.getUTCDay();
    const orderCount = dow === 5 || dow === 6 ? 78 : dow === 0 ? 61 : 44;
    daily.push({
      date: d.toISOString().slice(0, 10),
      orderCount,
      revenueCents: orderCount * 3_180,
    });
  }

  const weekAgo = new Date();
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  const week = daily.filter((r) => new Date(r.date) >= weekAgo);
  const revenueCents7d = week.reduce((s, r) => s + r.revenueCents, 0);
  const orderCount7d = week.reduce((s, r) => s + r.orderCount, 0);
  const aovCents = orderCount7d > 0 ? Math.round(revenueCents7d / orderCount7d) : null;
  const gbp = (cents: number) =>
    `£${(cents / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

  return {
    revenueCents7d,
    orderCount7d,
    aovCents,
    revenueDisplay: gbp(revenueCents7d),
    aovDisplay: aovCents != null ? gbp(aovCents) : "—",
    source: "preview",
    daily,
  };
}

export function getPreviewEventBreakdown(): { type: string; count: number }[] {
  return [
    { type: "PAGE_VIEW", count: 1_842 },
    { type: "MENU_VIEW", count: 611 },
    { type: "CTA_CLICK", count: 214 },
    { type: "PHONE_CLICK", count: 96 },
    { type: "DIRECTIONS_CLICK", count: 73 },
  ];
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
