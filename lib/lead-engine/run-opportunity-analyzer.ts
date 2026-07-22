import { analyzeProspectWebsite } from "@/lib/lead-engine/analyze-prospect";
import { getLeadEngineConfig } from "@/lib/lead-engine/config";
import { computeKobOpportunityScore } from "@/lib/lead-engine/kob-opportunity-score";
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

  const score = computeKobOpportunityScore({
    reviewCount: prospect.reviewCount,
    rating: prospect.rating,
    ratingBand: analysis.ratingBand,
    instagramFollowers: analysis.instagramFollowers,
    instagramPostGapDays: analysis.instagramPostGapDays,
    hasTikTok: analysis.hasTikTok,
    weakWebsite: analysis.weakWebsite,
    websiteStale: analysis.websiteStale,
    weakPhotography: analysis.weakPhotography,
    hasEmailCapture: analysis.hasEmailCapture,
    hasGoogleBusinessPosts: analysis.hasGoogleBusinessPosts,
    instagramFollowersKnown: analysis.instagramFollowers != null,
    locationCount: analysis.locationCount,
    platformRankPercentile: prospect.platformRankPercentile,
  });

  if (score.disqualifiers.length > 0) {
    await withDbRetry(
      () =>
        prisma.leadProspect.update({
          where: { id: prospect.id },
          data: {
            status: LeadProspectStatus.ARCHIVED,
            disqualifiers: score.disqualifiers,
            kobOpportunityScore: score.total,
            scoreBreakdown: score.breakdown,
            opportunities: score.opportunities,
            locationCount: analysis.locationCount,
            websiteStale: analysis.websiteStale,
            websiteCopyrightYear: analysis.websiteCopyrightYear,
            analyzedAt: new Date(),
          },
        }),
      "leadProspect.update(disqualified)",
    );
    return "disqualified";
  }

  await withDbRetry(
    () =>
      prisma.leadProspect.update({
        where: { id: prospect.id },
        data: {
          status: LeadProspectStatus.ANALYZED,
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
          kobOpportunityScore: score.total,
          scoreBreakdown: score.breakdown,
          opportunities: score.opportunities,
          disqualifiers: score.disqualifiers,
          analyzedAt: new Date(),
        },
      }),
    "leadProspect.update(analyzed)",
  );

  return "analyzed";
}
