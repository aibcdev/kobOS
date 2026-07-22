import { getLeadEngineConfig } from "@/lib/lead-engine/config";
import { pickLeadCityForDate } from "@/lib/lead-engine/city-rotation";
import {
  enrichPlatformLead,
  enrichmentQualifies,
} from "@/lib/lead-engine/enrich-platform-lead";
import { passesLeadIcpFilters } from "@/lib/lead-engine/icp-filters";
import {
  countQualifiedProspects,
  isLeadProspectDuplicateByKey,
  persistPlatformLead,
} from "@/lib/lead-engine/persist-prospect";
import { discoverPlatformLeadsForCity } from "@/lib/lead-engine/run-platform-discovery";
import { computeKobOpportunityScore } from "@/lib/lead-engine/kob-opportunity-score";

export type LeadFinderResult = {
  city: string;
  country: string;
  queryType: string;
  discovered: number;
  enriched: number;
  inserted: number;
  skipped: Record<string, number>;
  contactableTotal: number;
};

export async function runLeadFinder(
  workspaceRestaurantId: string,
  options?: {
    city?: string;
    country?: "GB" | "IE";
    max?: number;
    date?: Date;
  },
): Promise<LeadFinderResult> {
  const config = getLeadEngineConfig();
  const slot = options?.city
    ? { city: options.city, country: options.country ?? ("GB" as const) }
    : pickLeadCityForDate(options?.date);

  const max = options?.max ?? config.dailyCap;
  const skipped: Record<string, number> = {};
  const bump = (key: string) => {
    skipped[key] = (skipped[key] ?? 0) + 1;
  };

  const platformLeads = await discoverPlatformLeadsForCity(slot.city, slot.country);
  let enriched = 0;
  let inserted = 0;
  let attempts = 0;

  for (const lead of platformLeads) {
    if (
      await isLeadProspectDuplicateByKey(
        workspaceRestaurantId,
        lead.canonicalKey,
        null,
        null,
      )
    ) {
      bump("duplicate");
      continue;
    }

    if (attempts >= max) break;
    attempts++;

    const result = await enrichPlatformLead(lead, { fast: true });

    if (!enrichmentQualifies(result)) {
      bump(result.icpReason ?? "icp_fail");
      continue;
    }

    enriched++;

    const icpCheck = passesLeadIcpFilters({
      name: result.google.name,
      websiteUrl: result.google.websiteUrl,
      contactPhone: result.google.phoneNumber,
      contactEmail: result.contactEmail,
      rating: result.google.rating,
      reviewCount: result.google.reviewCount,
      platformReviewCount: lead.platformReviewCount,
      platformRankPercentile: lead.platformRankPercentile,
      locationCount: result.locationCount,
    });
    const ratingBand = icpCheck.ok ? icpCheck.ratingBand : "low";

    const score = computeKobOpportunityScore({
      reviewCount: result.google.reviewCount,
      rating: result.google.rating,
      ratingBand,
      instagramFollowers: result.instagramFollowers,
      instagramPostGapDays: null,
      hasTikTok: false,
      weakWebsite: result.weakWebsite,
      websiteStale: result.websiteStale,
      weakPhotography: false,
      hasEmailCapture: false,
      hasGoogleBusinessPosts: false,
      instagramFollowersKnown: result.instagramFollowers != null,
      locationCount: result.locationCount,
      platformRankPercentile: lead.platformRankPercentile,
    });

    const email =
      result.contactEmail && result.emailSource
        ? { email: result.contactEmail, source: result.emailSource }
        : null;

    await persistPlatformLead(workspaceRestaurantId, lead, result.google, email, {
      contactPhone: result.google.phoneNumber,
      locationCount: result.locationCount,
      weakWebsite: result.weakWebsite,
      websiteStale: result.websiteStale,
      websiteCopyrightYear: result.websiteCopyrightYear,
      hasContactForm: result.hasContactForm,
      instagramUrl: result.instagramUrl,
      instagramFollowers: result.instagramFollowers,
      kobOpportunityScore: score.total,
      scoreBreakdown: score.breakdown,
      opportunities: score.opportunities,
      disqualifiers: score.disqualifiers,
    });
    inserted++;
  }

  const contactableTotal = await countQualifiedProspects(workspaceRestaurantId);

  return {
    city: slot.city,
    country: slot.country,
    queryType: "platform",
    discovered: platformLeads.length,
    enriched,
    inserted,
    skipped,
    contactableTotal,
  };
}
