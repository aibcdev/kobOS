import { getOverviewMetrics } from "@/lib/dashboard/overview-metrics";
import { parseAuditPayload } from "@/lib/audit/types";
import { buildDigestSnapshot } from "@/lib/digest/build-snapshot";
import { prisma } from "@/lib/db/prisma";

export type GrowthAgentBriefingContext = {
  name: string;
  cuisine: string | null;
  city: string | null;
  state: string | null;
  vibe: string | null;
  website: string | null;
  googleBusinessUrl: string | null;
  visibilityScore: number | null;
  trafficEventsThisWeek: number;
  trafficEventsPrevWeek: number;
  trafficChangeLabel: string;
  openInsightTitles: string[];
  recommendationTitles: string[];
  topKeywords: string[];
  assetSummary: string;
  reviewSummary: string;
  websiteNotes: string;
  visualHealthHint: string;
  /** Latest public audit scan linked to this restaurant (SiteScan / VisibilityAudit funnel). */
  latestLinkedAuditSnapshot: string;
};

function summarizeAssets(rows: { type: string; _count: { _all: number } }[]): string {
  if (!rows.length) return "No assets uploaded yet — add food photos and logo in Settings.";
  return rows.map((r) => `${r._count._all}× ${r.type.replace(/_/g, " ").toLowerCase()}`).join(", ");
}

export async function buildGrowthAgentBriefingContext(restaurantId: string): Promise<GrowthAgentBriefingContext | null> {
  const [restaurant, digest, metrics, keywords, assetGroups, reviews, latestScan, linkedSiteScan, linkedAudit] =
    await Promise.all([
    prisma.restaurant.findUnique({ where: { id: restaurantId } }),
    buildDigestSnapshot(restaurantId),
    getOverviewMetrics(restaurantId),
    prisma.keyword.findMany({
      where: { restaurantId },
      orderBy: { opportunityScore: "desc" },
      take: 8,
      select: { keyword: true },
    }),
    prisma.asset.groupBy({
      by: ["type"],
      where: { restaurantId },
      _count: { _all: true },
    }),
    prisma.customerReview.findMany({
      where: { restaurantId },
      orderBy: { reviewedAt: "desc" },
      take: 5,
      select: { rating: true, body: true, reviewerName: true },
    }),
    prisma.dailyScan.findFirst({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.siteScan.findFirst({
      where: { visibilityAudit: { restaurantId } },
      orderBy: { updatedAt: "desc" },
      include: {
        visibilityAudit: {
          select: {
            id: true,
            overallScore: true,
            designScore: true,
            websiteUrl: true,
            resultPayload: true,
          },
        },
      },
    }),
    prisma.visibilityAudit.findFirst({
      where: { restaurantId },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  if (!restaurant) return null;

  let trafficChangeLabel = "flat";
  if (metrics.trafficChangePct == null) {
    trafficChangeLabel =
      metrics.trafficEventsThisWeek === 0 && metrics.trafficEventsPrevWeek === 0 ? "no baseline" : "building baseline";
  } else {
    trafficChangeLabel = `${metrics.trafficChangePct >= 0 ? "+" : ""}${metrics.trafficChangePct}% vs prior week`;
  }

  const foodCount = assetGroups.find((g) => g.type === "FOOD_PHOTO")?._count._all ?? 0;
  let visualHealthHint = `${Math.min(100, 48 + Math.min(40, foodCount * 6))}/100 heuristic from food assets on file`;
  if (latestScan?.visualHealthScore != null) {
    visualHealthHint = `${latestScan.visualHealthScore}/100 from last DailyScan record`;
  }

  let reviewSummary = "No reviews in KOB yet — import or sync Google reviews next.";
  if (reviews.length) {
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    const snippet = reviews[0]?.body?.slice(0, 120) ?? "";
    reviewSummary = `Last ${reviews.length} reviews avg ${avg.toFixed(1)}★. Latest: "${snippet}${snippet.length >= 120 ? "…" : ""}"`;
  } else if (linkedAudit) {
    const payload = parseAuditPayload(linkedAudit.resultPayload);
    const gp = payload?.evidencePack?.googlePlace;
    if (gp?.reviews?.length) {
      reviewSummary = `Audit found ${gp.reviewCount ?? gp.reviews.length} Google reviews at ${gp.rating?.toFixed(1) ?? "?"}★.`;
    }
  }

  const auditWebsite = linkedAudit?.websiteUrl?.trim() || linkedSiteScan?.visibilityAudit?.websiteUrl?.trim();
  const effectiveWebsite = restaurant.website?.trim() || auditWebsite || null;

  const websiteNotes = effectiveWebsite
    ? `Site URL on file (${effectiveWebsite}); ${keywords.length ? `${keywords.length} tracked keywords` : "add keywords for crawl context"}.`
    : "No website URL — add it for redesign and crawl workflows.";

  let visibilityScore = metrics.visibilityScore;
  if (visibilityScore == null && linkedAudit) {
    visibilityScore = linkedAudit.overallScore;
  }

  let latestLinkedAuditSnapshot = "No Visibility Audit linked to this workspace yet — run the public grader and connect it during signup/trial.";
  const auditForSnapshot = linkedSiteScan?.visibilityAudit ?? linkedAudit;
  if (auditForSnapshot) {
    const a = auditForSnapshot;
    const payload = parseAuditPayload("resultPayload" in a ? a.resultPayload : null);
    const perception = payload?.perceptionAuditV1;
    latestLinkedAuditSnapshot = `Linked audit overall ${a.overallScore}/100, design ${a.designScore}/100. Site: ${a.websiteUrl ?? effectiveWebsite ?? "n/a"}. ${perception?.ownerHero?.revenueHeadline ?? ""}`;
  }

  return {
    name: restaurant.name,
    cuisine: restaurant.cuisineType,
    city: restaurant.city,
    state: restaurant.state,
    vibe: restaurant.vibe,
    website: effectiveWebsite,
    googleBusinessUrl: restaurant.googleBusinessUrl,
    visibilityScore,
    trafficEventsThisWeek: metrics.trafficEventsThisWeek,
    trafficEventsPrevWeek: metrics.trafficEventsPrevWeek,
    trafficChangeLabel,
    openInsightTitles: digest.openInsights.map((i) => i.title),
    recommendationTitles: digest.topRecommendations.map((r) => r.title),
    topKeywords: keywords.map((k) => k.keyword),
    assetSummary: summarizeAssets(assetGroups),
    reviewSummary,
    websiteNotes,
    visualHealthHint,
    latestLinkedAuditSnapshot,
  };
}
