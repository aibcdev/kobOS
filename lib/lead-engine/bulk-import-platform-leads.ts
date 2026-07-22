import { platformFoundWhere } from "@/lib/lead-engine/contactable-query";
import { computeKobOpportunityScore } from "@/lib/lead-engine/kob-opportunity-score";
import type { MergedPlatformLead } from "@/lib/lead-engine/merge-platform-listings";
import {
  isLeadProspectDuplicateByKey,
  persistPlatformLead,
} from "@/lib/lead-engine/persist-prospect";
import { mergePlatformTagsOnExisting } from "@/lib/lead-engine/sync-platform-tags";
import { discoverPlatformLeadsForCity } from "@/lib/lead-engine/run-platform-discovery";
import { getLeadEngineConfig } from "@/lib/lead-engine/config";
import type { GoogleEnrichedLead } from "@/lib/lead-engine/google-enrich";
import { prisma } from "@/lib/db/prisma";

export type BulkImportResult = {
  city: string;
  country: string;
  discovered: number;
  inserted: number;
  skipped: Record<string, number>;
  totalFound: number;
};

function platformGoogle(lead: MergedPlatformLead): GoogleEnrichedLead {
  return {
    placeId: null,
    name: lead.name,
    city: lead.city,
    formattedAddress: lead.address ?? "",
    websiteUrl: null,
    phoneNumber: null,
    rating: lead.platformRating,
    reviewCount: lead.platformReviewCount,
    lastReviewAt: null,
  };
}

export async function bulkImportPlatformLeadsForCity(
  workspaceRestaurantId: string,
  city: string,
  country: "GB" | "IE" = "GB",
  options?: { max?: number },
): Promise<BulkImportResult> {
  const config = getLeadEngineConfig();
  const max = options?.max ?? 500;
  const skipped: Record<string, number> = {};
  const bump = (key: string) => {
    skipped[key] = (skipped[key] ?? 0) + 1;
  };

  const platformLeads = await discoverPlatformLeadsForCity(city, country);
  let inserted = 0;
  let attempts = 0;

  for (const lead of platformLeads) {
    const reviews = lead.platformReviewCount ?? 0;
    if (reviews <= config.reviewMin - 1) {
      bump("reviews_too_low");
      continue;
    }

    if (
      await isLeadProspectDuplicateByKey(workspaceRestaurantId, lead.canonicalKey, null, null)
    ) {
      await mergePlatformTagsOnExisting(workspaceRestaurantId, lead);
      bump("duplicate");
      continue;
    }

    if (attempts >= max) break;
    attempts++;

    const google = platformGoogle(lead);

    const score = computeKobOpportunityScore({
      reviewCount: google.reviewCount,
      rating: google.rating,
      ratingBand: google.rating != null && google.rating < 4.2 ? "ideal" : "low",
      instagramFollowers: null,
      instagramPostGapDays: null,
      hasTikTok: false,
      weakWebsite: false,
      websiteStale: false,
      weakPhotography: false,
      hasEmailCapture: false,
      hasGoogleBusinessPosts: false,
      instagramFollowersKnown: false,
      locationCount: null,
      platformRankPercentile: lead.platformRankPercentile,
    });

    await persistPlatformLead(workspaceRestaurantId, lead, google, null, {
      contactPhone: null,
      kobOpportunityScore: score.total,
      scoreBreakdown: score.breakdown,
      opportunities: score.opportunities,
      disqualifiers: score.disqualifiers,
    });
    inserted++;
  }

  const totalFound = await prisma.leadProspect.count({
    where: platformFoundWhere(workspaceRestaurantId),
  });

  return { city, country, discovered: platformLeads.length, inserted, skipped, totalFound };
}
