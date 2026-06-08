import { discoverProspectsInCity } from "@/lib/outbound/discover-prospects";
import { enrichProspectEmail } from "@/lib/outbound/enrich-email";
import { generateUkColdDraft } from "@/lib/outbound/generate-uk-cold-draft";
import { getOutboundIcpConfig } from "@/lib/outbound/icp-config";
import { isUkColdLeadDuplicate, persistUkColdLead } from "@/lib/outbound/persist-uk-cold-lead";
import { qualifyProspect } from "@/lib/outbound/qualify-prospect";
import type { UkColdQualifiedProspect } from "@/lib/outbound/prospect-types";
import { pickUkCityForDate } from "@/lib/outbound/uk-city-rotation";

export type UkColdPipelineResult = {
  city: string;
  discovered: number;
  qualified: number;
  enriched: number;
  inserted: number;
  skipped: Record<string, number>;
};

export async function runUkColdPipeline(
  workspaceRestaurantId: string,
  options?: { city?: string; date?: Date },
): Promise<UkColdPipelineResult> {
  const icp = getOutboundIcpConfig();
  const city = options?.city?.trim() || pickUkCityForDate(options?.date);
  const skipped: Record<string, number> = {};
  const bump = (key: string) => {
    skipped[key] = (skipped[key] ?? 0) + 1;
  };

  const prospects = await discoverProspectsInCity(city, icp.dailyProspectCap);
  let qualified = 0;
  let enriched = 0;
  let inserted = 0;

  for (const p of prospects) {
    if (await isUkColdLeadDuplicate(workspaceRestaurantId, p.websiteUrl, p.placeId)) {
      bump("duplicate");
      continue;
    }

    const q = await qualifyProspect(p);
    if (!q.ok) {
      bump(q.reason);
      continue;
    }
    qualified++;

    const emailResult = await enrichProspectEmail(p.websiteUrl);
    if (!emailResult.ok) {
      bump(emailResult.reason);
      continue;
    }
    enriched++;

    const qualifiedProspect: UkColdQualifiedProspect = {
      ...p,
      qualifyScore: q.qualifyScore,
      topIssue: q.topIssue,
      contactEmail: emailResult.email,
      enrichmentSource: emailResult.source,
    };

    const draftResult = await generateUkColdDraft({
      restaurantName: p.name,
      city,
      topIssue: q.topIssue,
      qualifyScore: q.qualifyScore,
      websiteUrl: p.websiteUrl!,
    });
    if (!draftResult.ok) {
      bump("draft_failed");
      continue;
    }

    await persistUkColdLead(workspaceRestaurantId, city, qualifiedProspect, draftResult.draft);
    inserted++;
  }

  return {
    city,
    discovered: prospects.length,
    qualified,
    enriched,
    inserted,
    skipped,
  };
}
