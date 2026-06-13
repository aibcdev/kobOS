import type { OutboundProspect } from "@/lib/outbound/prospect-types";
import { getOutboundIcpConfig } from "@/lib/outbound/icp-config";
import { passesLeadIcpFilters } from "@/lib/lead-engine/icp-filters";
import { placesPlaceDetailsNew } from "@/lib/places/google-places-server";
import { auditPlacesRegionCodes } from "@/lib/places/audit-places-config";

function passesIcpFilters(
  p: {
    name: string;
    websiteUrl: string | null;
    userRatingCount: number | null;
    rating: number | null;
  },
  icp: ReturnType<typeof getOutboundIcpConfig>,
): boolean {
  const result = passesLeadIcpFilters({
    name: p.name,
    websiteUrl: p.websiteUrl,
    userRatingCount: p.userRatingCount,
    rating: p.rating,
    lastReviewAt: null,
  });
  if (!result.ok) return false;
  if (icp.requireWebsite && !p.websiteUrl?.trim()) return false;
  const reviews = p.userRatingCount ?? 0;
  if (reviews < icp.reviewMin || reviews > icp.reviewMax) return false;
  return true;
}

/**
 * Find real restaurants in a city via Places Text Search (not AI-invented names).
 */
export async function discoverProspectsInCity(city: string, max = 15): Promise<OutboundProspect[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!key) return [];

  const icp = getOutboundIcpConfig();
  const fetchCap = Math.min(40, max * 3);

  const textQuery = `restaurants in ${city.trim()}, UK`.slice(0, 200);
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
      includedType: "restaurant",
      regionCode: auditPlacesRegionCodes()[0] ?? "GB",
    }),
  });

  if (!res.ok) {
    console.warn("[outbound] places searchText HTTP", res.status);
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

  const out: OutboundProspect[] = [];
  for (const p of json.places ?? []) {
    const name = p.displayName?.text?.trim();
    const placeId = p.id?.replace(/^places\//, "") ?? "";
    if (!name || !placeId) continue;

    let websiteUrl = p.websiteUri?.trim() || null;
    if (!websiteUrl) {
      const details = await placesPlaceDetailsNew(placeId);
      websiteUrl = details?.websiteUri ?? null;
    }

    const candidate = {
      placeId,
      name,
      formattedAddress: p.formattedAddress ?? "",
      websiteUrl,
      rating: p.rating ?? null,
      userRatingCount: p.userRatingCount ?? null,
    };

    if (!passesIcpFilters(candidate, icp)) continue;

    out.push(candidate);
    if (out.length >= max) break;
  }

  return out;
}

export function isOutboundPlacesDiscoveryEnabled(): boolean {
  if (process.env.OUTBOUND_USE_PLACES === "0") return false;
  return Boolean(process.env.GOOGLE_PLACES_API_KEY?.trim());
}
