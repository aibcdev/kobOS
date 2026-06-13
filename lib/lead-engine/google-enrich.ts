import { placesPlaceAuditEnrichment, placesPlaceDetailsNew } from "@/lib/places/google-places-server";
import { auditPlacesRegionCodes } from "@/lib/places/audit-places-config";

export type GoogleEnrichedLead = {
  placeId: string;
  name: string;
  city: string;
  formattedAddress: string;
  websiteUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  lastReviewAt: Date | null;
};

function parseLastReviewAt(reviews: Array<{ publishTime?: string | null }>): Date | null {
  let latest: Date | null = null;
  for (const r of reviews) {
    if (!r.publishTime) continue;
    const d = new Date(r.publishTime);
    if (!Number.isNaN(d.getTime()) && (!latest || d > latest)) latest = d;
  }
  return latest;
}

export async function enrichLeadFromGoogle(
  restaurantName: string,
  city: string,
  country: "GB" | "IE",
): Promise<GoogleEnrichedLead | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!key) return null;

  const region = country === "IE" ? "IE" : auditPlacesRegionCodes()[0] ?? "GB";
  const textQuery = `${restaurantName} ${city}`.trim().slice(0, 200);

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
      maxResultCount: 5,
      includedType: "restaurant",
      regionCode: region,
    }),
  });

  if (!res.ok) return null;

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

  const pick = json.places?.[0];
  if (!pick?.id) return null;

  const placeId = pick.id.replace(/^places\//, "");
  let websiteUrl = pick.websiteUri?.trim() || null;
  if (!websiteUrl) {
    const details = await placesPlaceDetailsNew(placeId);
    websiteUrl = details?.websiteUri ?? null;
  }

  const enrichment = await placesPlaceAuditEnrichment(placeId);

  return {
    placeId,
    name: pick.displayName?.text ?? restaurantName,
    city,
    formattedAddress: pick.formattedAddress ?? "",
    websiteUrl,
    rating: pick.rating ?? enrichment?.rating ?? null,
    reviewCount: pick.userRatingCount ?? enrichment?.reviewCount ?? null,
    lastReviewAt: parseLastReviewAt(enrichment?.reviews ?? []),
  };
}
