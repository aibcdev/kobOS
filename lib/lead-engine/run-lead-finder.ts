import { getLeadEngineConfig } from "@/lib/lead-engine/config";
import { pickLeadCityForDate } from "@/lib/lead-engine/city-rotation";
import { enrichLeadFromGoogle } from "@/lib/lead-engine/google-enrich";
import { passesLeadIcpFilters } from "@/lib/lead-engine/icp-filters";
import {
  countContactableProspects,
  isLeadProspectDuplicateByKey,
  persistPlatformLead,
} from "@/lib/lead-engine/persist-prospect";
import { discoverPlatformLeadsForCity } from "@/lib/lead-engine/run-platform-discovery";
import { enrichProspectEmail } from "@/lib/outbound/enrich-email";

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
  let processed = 0;

  for (const lead of platformLeads) {
    if (processed >= max) break;
    processed++;

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

    const google = await enrichLeadFromGoogle(lead.name, lead.city, lead.country);
    if (!google) {
      bump("google_match_failed");
      continue;
    }

    const icp = passesLeadIcpFilters({
      name: google.name,
      websiteUrl: google.websiteUrl,
      userRatingCount: google.reviewCount,
      rating: google.rating,
      lastReviewAt: google.lastReviewAt,
      platformRankPercentile: lead.platformRankPercentile,
    });
    if (!icp.ok) {
      bump(icp.reason);
      continue;
    }

    let emailResult: { email: string; source: string } | null = null;
    if (google.websiteUrl) {
      const e = await enrichProspectEmail(google.websiteUrl, { scrapeOnly: true });
      if (e.ok) {
        emailResult = { email: e.email, source: e.source };
        enriched++;
      } else {
        bump(e.reason);
      }
    } else {
      bump("no_website");
    }

    if (!emailResult) continue;

    await persistPlatformLead(workspaceRestaurantId, lead, google, emailResult);
    inserted++;
  }

  const contactableTotal = await countContactableProspects(workspaceRestaurantId);

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
