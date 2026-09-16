import {
  placesAutocompleteNew,
  placesPlaceAuditEnrichment,
  placesPlaceClassifierFields,
  placesPlaceDetailsNew,
  placesSearchNearbyRestaurants,
} from "@/lib/places/google-places-server";
import {
  buildOnboardProfile,
  normalizeRole,
  type OnboardProfile,
  type OnboardRole,
} from "@/lib/kob/onboard-profile";

async function findPlaceByName(companyName: string) {
  const q = companyName.trim();
  if (!q) return null;

  const suggestions = await placesAutocompleteNew(q);
  const top = suggestions[0];
  if (top) {
    const details = await placesPlaceDetailsNew(top.placeId);
    if (details) return details;
  }

  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!key) return null;

  const { auditPlacesRegionCodes } = await import("@/lib/places/audit-places-config");
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.location,nationalPhoneNumber",
    },
    body: JSON.stringify({
      textQuery: q.slice(0, 200),
      languageCode: "en-GB",
      maxResultCount: 3,
      includedType: "restaurant",
      regionCode: auditPlacesRegionCodes()[0] ?? "GB",
    }),
  });

  if (!res.ok) return null;

  const json = (await res.json()) as {
    places?: Array<{
      id?: string
      displayName?: { text?: string }
      formattedAddress?: string
      websiteUri?: string
      nationalPhoneNumber?: string
      location?: { latitude?: number; longitude?: number }
    }>
  };

  const pick = json.places?.[0];
  if (!pick?.id) return null;

  return {
    placeId: pick.id,
    name: pick.displayName?.text ?? q,
    formattedAddress: pick.formattedAddress ?? "",
    websiteUri: pick.websiteUri?.trim() || null,
    phoneNumber: pick.nationalPhoneNumber?.trim() || null,
    lat: pick.location?.latitude ?? null,
    lng: pick.location?.longitude ?? null,
  };
}

function cuisineFromClassifier(
  fields: Awaited<ReturnType<typeof placesPlaceClassifierFields>>,
): string {
  if (!fields) return "Independent restaurant";
  const primary = fields.primaryType?.replace(/_/g, " ");
  if (primary && primary !== "restaurant") {
    return primary.charAt(0).toUpperCase() + primary.slice(1);
  }
  const editorial = fields.editorialSummary?.slice(0, 80);
  if (editorial) return editorial;
  return "Independent restaurant";
}

/** Server-only: company name + role → full onboard profile. */
export async function enrichOnboardInput(
  companyName: string,
  roleRaw: string | undefined,
): Promise<OnboardProfile> {
  const role: OnboardRole = normalizeRole(roleRaw);
  const place = await findPlaceByName(companyName);

  if (!place) {
    return buildOnboardProfile({
      companyName,
      role,
      place: null,
      enrichment: null,
      peers: [],
      cuisine: "Independent restaurant",
      source: "heuristic",
    });
  }

  const [classifier, enrichment] = await Promise.all([
    placesPlaceClassifierFields(place.placeId),
    placesPlaceAuditEnrichment(place.placeId),
  ]);

  let peers: { rating: number | null; userRatingCount: number | null }[] = [];
  if (place.lat != null && place.lng != null) {
    const nearby = await placesSearchNearbyRestaurants(
      place.lat,
      place.lng,
      place.name,
      6,
    );
    peers = nearby.map((p) => ({
      rating: p.rating,
      userRatingCount: p.userRatingCount,
    }));
  }

  return buildOnboardProfile({
    companyName,
    role,
    place: {
      placeId: place.placeId,
      name: place.name,
      formattedAddress: place.formattedAddress,
      websiteUri: place.websiteUri,
      phoneNumber: place.phoneNumber,
    },
    enrichment: enrichment
      ? {
          rating: enrichment.rating,
          reviewCount: enrichment.reviewCount,
          photoCount: enrichment.photoCount ?? 0,
          reviews: enrichment.reviews.map((r) => ({
            rating: r.rating,
            text: r.text,
          })),
        }
      : null,
    peers,
    cuisine: cuisineFromClassifier(classifier),
    source: "places",
  });
}
