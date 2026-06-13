import type { LeadQueryType } from "@/lib/lead-engine/config";
import { passesLeadIcpFilters } from "@/lib/lead-engine/icp-filters";
import { placesPlaceAuditEnrichment } from "@/lib/places/google-places-server";
import type { OutboundProspect } from "@/lib/outbound/prospect-types";
import { isLikelyChainRestaurant } from "@/lib/outbound/chain-denylist";
import { placesPlaceDetailsNew } from "@/lib/places/google-places-server";

export type DiscoveredLead = OutboundProspect & {
  city: string;
  country: "GB" | "IE";
  businessType: LeadQueryType;
  lastReviewAt: Date | null;
};

function countryLabel(country: "GB" | "IE"): string {
  return country === "IE" ? "Ireland" : "UK";
}

function parseLastReviewAt(reviews: Array<{ publishTime?: string | null }>): Date | null {
  let latest: Date | null = null;
  for (const r of reviews) {
    if (!r.publishTime) continue;
    const d = new Date(r.publishTime);
    if (!Number.isNaN(d.getTime()) && (!latest || d > latest)) latest = d;
  }
  return latest;
}

/**
 * Find independents in a city via Places Text Search with lead-engine ICP.
 */
export async function discoverLeadsInCity(
  city: string,
  country: "GB" | "IE",
  queryType: LeadQueryType,
  max = 15,
): Promise<DiscoveredLead[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!key) return [];

  const fetchCap = Math.min(40, max * 3);
  const textQuery = `${queryType}s in ${city.trim()}, ${countryLabel(country)}`.slice(0, 200);

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.rating,places.userRatingCount",
    },
    body: JSON.stringify({
      textQuery,
      languageCode: "en",
      maxResultCount: fetchCap,
      includedType: queryType === "takeaway" ? "meal_takeaway" : queryType === "cafe" ? "cafe" : "restaurant",
      regionCode: country,
    }),
  });

  if (!res.ok) {
    console.warn("[lead-engine] places searchText HTTP", res.status);
    return [];
  }

  const json = (await res.json()) as {
    places?: Array<{
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      websiteUri?: string;
      rating?: number;
      userRatingCount?: number;
    }>;
  };

  const out: DiscoveredLead[] = [];
  for (const p of json.places ?? []) {
    const name = p.displayName?.text?.trim();
    const placeId = p.id?.replace(/^places\//, "") ?? "";
    if (!name || !placeId) continue;
    if (isLikelyChainRestaurant(name, p.websiteUri ?? null)) continue;

    let websiteUrl = p.websiteUri?.trim() || null;
    if (!websiteUrl) {
      const details = await placesPlaceDetailsNew(placeId);
      websiteUrl = details?.websiteUri ?? null;
    }

    const enrichment = await placesPlaceAuditEnrichment(placeId);
    const lastReviewAt = parseLastReviewAt(enrichment?.reviews ?? []);

    const candidate = {
      name,
      websiteUrl,
      userRatingCount: p.userRatingCount ?? enrichment?.reviewCount ?? null,
      rating: p.rating ?? enrichment?.rating ?? null,
      lastReviewAt,
    };

    const icp = passesLeadIcpFilters(candidate);
    if (!icp.ok) continue;

    out.push({
      placeId,
      name,
      city: city.trim(),
      formattedAddress: p.formattedAddress ?? "",
      websiteUrl,
      rating: candidate.rating,
      userRatingCount: candidate.userRatingCount,
      country,
      businessType: queryType,
      lastReviewAt,
    });

    if (out.length >= max) break;
  }

  return out;
}
