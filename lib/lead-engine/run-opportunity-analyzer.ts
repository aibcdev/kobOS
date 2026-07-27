import { analyzeProspectWebsite } from "@/lib/lead-engine/analyze-prospect";
import { getLeadEngineAnalyzerConcurrency, getLeadEngineConfig } from "@/lib/lead-engine/config";
import { mapProspectToIcpInput } from "@/lib/outbound/map-to-icp-input";
import { scoreIcp } from "@/lib/outbound/score-icp";
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

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!);
    }
  }
  const n = Math.max(1, Math.min(concurrency, items.length || 1));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
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
  const concurrency = getLeadEngineAnalyzerConcurrency();
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

  const outcomes = await mapPool(prospects, concurrency, (prospect) => analyzeAndPersistProspect(prospect));
  let analyzed = 0;
  for (const result of outcomes) {
    if (result === "analyzed") analyzed++;
    else bump(result);
  }

  return { processed: prospects.length, analyzed, skipped };
}

async function analyzeAndPersistProspect(prospect: LeadProspect): Promise<"analyzed" | string> {
  if (!prospect.websiteUrl) return "no_website";

  const analysis = await analyzeProspectWebsite(prospect);
  if (!analysis) {
    await withDbRetry(
      () =>
        prisma.leadProspect.update({
          where: { id: prospect.id },
          data: {
            status: LeadProspectStatus.ARCHIVED,
            disqualifiers: ["icp_or_analyze_failed"],
            analyzedAt: new Date(),
          },
        }),
      "leadProspect.update(icp_failed)",
    );
    return "icp_failed";
  }
  const locationMax = getLeadEngineConfig().locationMax;
  if (analysis.locationCount > locationMax) {
    await withDbRetry(
      () =>
        prisma.leadProspect.update({
          where: { id: prospect.id },
          data: {
            status: LeadProspectStatus.ARCHIVED,
            locationCount: analysis.locationCount,
            disqualifiers: [`too_many_locations (${analysis.locationCount})`],
            analyzedAt: new Date(),
          },
        }),
      "leadProspect.update(too_many_locations)",
    );
    return "too_many_locations";
  }

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

  // Canonical gate: ICP Fit Score ≥70 (kob-audit-engine). Opportunity metrics are enrichment only.
  const icp = scoreIcp(mapped);
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
    kobOpportunityScore: icp.fit_score,
    scoreBreakdown: {
      version: icp.version,
      status: icp.status,
      fit_score: icp.fit_score,
      fit_proxy: opp.fit_proxy,
      opportunity_score: metrics,
      matched_factors: icp.matched_factors,
      recommended_email_angle: icp.recommended_email_angle ?? opp.recommended_email_angle,
      personalization_hooks: icp.personalization_hooks,
      opportunity_reasons: opp.reasons,
    },
    opportunities: [
      ...icp.personalization_hooks,
      ...(metrics
        ? [
            `Est. ${metrics.est_monthly_lost_customers} lost customers/mo (~${metrics.currency}${metrics.est_lost_revenue})`,
          ]
        : []),
    ].filter(Boolean),
    disqualifiers: icp.disqualifiers,
    analyzedAt: new Date(),
  };

  if (icp.status !== "qualified") {
    await withDbRetry(
      () =>
        prisma.leadProspect.update({
          where: { id: prospect.id },
          data: {
            status: LeadProspectStatus.ARCHIVED,
            ...shared,
            disqualifiers:
              icp.disqualifiers.length > 0
                ? icp.disqualifiers
                : [`icp_${icp.status}_fit${icp.fit_score}`],
          },
        }),
      "leadProspect.update(icp_not_qualified)",
    );
    return icp.status === "park" ? "icp_park" : "disqualified";
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
