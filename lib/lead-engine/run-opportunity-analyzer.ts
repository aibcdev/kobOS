import { analyzeProspectWebsite } from "@/lib/lead-engine/analyze-prospect";
import { getLeadEngineConfig } from "@/lib/lead-engine/config";
import { mapProspectToIcpInput } from "@/lib/outbound/map-to-icp-input";
import { calculateOpportunityScore } from "@/lib/outbound/score-opportunity";
import { LeadProspectStatus, type LeadProspect } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withDbRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e: unknown) {
      const code = typeof e === "object" && e && "code" in e ? String((e as { code?: string }).code) : "";
      if (code !== "P2024" || attempt === maxAttempts) throw e;
      const waitMs = 1500 * attempt;
      console.warn(`${label}: db pool busy, retry ${attempt}/${maxAttempts - 1} in ${waitMs}ms`);
      await sleep(waitMs);
    }
  }
  throw new Error(`${label}: unreachable`);
}

export type OpportunityAnalyzerResult = {
  processed: number;
  analyzed: number;
  skipped: Record<string, number>;
};

export async function runOpportunityAnalyzer(
  workspaceRestaurantId: string,
  options?: { max?: number },
): Promise<OpportunityAnalyzerResult> {
  const config = getLeadEngineConfig();
  const max = options?.max ?? config.analyzerDailyCap;
  const skipped: Record<string, number> = {};
  const bump = (key: string) => {
    skipped[key] = (skipped[key] ?? 0) + 1;
  };

  const prospects = await prisma.leadProspect.findMany({
    where: {
      workspaceRestaurantId,
      status: LeadProspectStatus.DISCOVERED,
      contactEmail: { not: null },
    },
    orderBy: { createdAt: "asc" },
    take: max,
  });

  let analyzed = 0;

  for (const prospect of prospects) {
    const result = await analyzeAndPersistProspect(prospect);
    if (result === "analyzed") analyzed++;
    else bump(result);
  }

  return { processed: prospects.length, analyzed, skipped };
}

async function analyzeAndPersistProspect(prospect: LeadProspect): Promise<"analyzed" | string> {
  if (!prospect.websiteUrl) return "no_website";

  const analysis = await analyzeProspectWebsite(prospect);
  if (!analysis) return "icp_failed";

  const mapped = mapProspectToIcpInput({
    placeId: prospect.placeId,
    name: prospect.name,
    city: prospect.city,
    websiteUrl: prospect.websiteUrl,
    rating: prospect.rating,
    reviewCount: prospect.reviewCount,
    locationCount: analysis.locationCount,
    instagramPostGapDays: analysis.instagramPostGapDays,
    websiteCopyrightYear: analysis.websiteCopyrightYear,
    websiteStale: analysis.websiteStale,
    weakWebsite: analysis.weakWebsite,
    hasGoogleBusinessPosts: analysis.hasGoogleBusinessPosts,
    deliveryPlatforms: prospect.deliveryPlatforms,
    platformRankPercentile: prospect.platformRankPercentile,
  });

  const opp = calculateOpportunityScore({
    ...mapped,
    avg_ticket: 32,
    currency: "GBP",
  });

  const metrics = opp.opportunity_score;
  const shared = {
    instagramUrl: analysis.instagramUrl,
    instagramFollowers: analysis.instagramFollowers,
    instagramPostGapDays: analysis.instagramPostGapDays,
    hasTikTok: analysis.hasTikTok,
    facebookUrl: analysis.facebookUrl,
    hasContactForm: analysis.hasContactForm,
    weakWebsite: analysis.weakWebsite,
    weakPhotography: analysis.weakPhotography,
    hasEmailCapture: analysis.hasEmailCapture,
    pdfMenu: analysis.pdfMenu,
    hasGoogleBusinessPosts: analysis.hasGoogleBusinessPosts,
    hasTripadvisor: analysis.hasTripadvisor,
    hasOnlineOrdering: analysis.hasOnlineOrdering,
    locationCount: analysis.locationCount,
    websiteStale: analysis.websiteStale,
    websiteCopyrightYear: analysis.websiteCopyrightYear,
    kobOpportunityScore: opp.fit_proxy ?? 0,
    scoreBreakdown: {
      version: opp.version,
      status: opp.status,
      fit_proxy: opp.fit_proxy,
      opportunity_score: metrics,
      recommended_email_angle: opp.recommended_email_angle,
      reasons: opp.reasons,
    },
    opportunities: opp.personalization_hooks.length
      ? [
          ...opp.personalization_hooks,
          ...(metrics
            ? [
                `Est. ${metrics.est_monthly_lost_customers} lost customers/mo (~${metrics.currency}${metrics.est_lost_revenue})`,
              ]
            : []),
        ]
      : opp.reasons,
    disqualifiers:
      opp.disqualifiers.length > 0
        ? opp.disqualifiers
        : opp.status !== "qualified"
          ? [`opportunity_${opp.status}_fit${opp.fit_proxy ?? 0}`]
          : [],
    analyzedAt: new Date(),
  };

  if (opp.status !== "qualified") {
    await withDbRetry(
      () =>
        prisma.leadProspect.update({
          where: { id: prospect.id },
          data: {
            status: LeadProspectStatus.ARCHIVED,
            ...shared,
          },
        }),
      "leadProspect.update(opportunity_not_qualified)",
    );
    return opp.status === "park" ? "opportunity_park" : "disqualified";
  }

  await withDbRetry(
    () =>
      prisma.leadProspect.update({
        where: { id: prospect.id },
        data: {
          status: LeadProspectStatus.ANALYZED,
          ...shared,
        },
      }),
    "leadProspect.update(analyzed)",
  );

  return "analyzed";
}
