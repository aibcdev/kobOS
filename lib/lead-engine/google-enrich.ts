import { placesPlaceAuditEnrichment, placesPlaceDetailsNew } from "@/lib/places/google-places-server";
import { auditPlacesRegionCodes } from "@/lib/places/audit-places-config";

export type GoogleEnrichedLead = {
  placeId: string | null;
  name: string;
  city: string;
  formattedAddress: string;
  websiteUrl: string | null;
  phoneNumber: string | null;
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

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function nameMatches(query: string, candidate: string): boolean {
  const q = normalizeName(query);
  const c = normalizeName(candidate);
  if (!q || !c) return false;
  const qSlice = q.slice(0, Math.min(10, q.length));
  const cSlice = c.slice(0, Math.min(10, c.length));
  return c.includes(qSlice) || q.includes(cSlice);
}

let places401Warned = false;

export async function enrichLeadFromGoogle(
  restaurantName: string,
  city: string,
  country: "GB" | "IE",
): Promise<GoogleEnrichedLead | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!key) return null;

  const region = country === "IE" ? "IE" : auditPlacesRegionCodes()[0] ?? "GB";
  const baseQuery = `${restaurantName} ${city}`.trim();

  async function searchPlaces(suffix: string) {
    const textQuery = `${baseQuery} ${suffix}`.trim().slice(0, 200);
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key!,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.rating,places.userRatingCount,places.nationalPhoneNumber",
      },
      body: JSON.stringify({
        textQuery,
        languageCode: "en",
        maxResultCount: 10,
        regionCode: region,
      }),
    });
    if (!res.ok) {
      if (res.status === 401 && !places401Warned) {
        places401Warned = true;
        console.warn(
          "[lead-engine] Google Places API returned 401 — fix GOOGLE_PLACES_API_KEY or use web search fallback",
        );
      }
      return null;
    }
    return (await res.json()) as {
      places?: Array<{
        id?: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        websiteUri?: string;
        rating?: number;
        userRatingCount?: number;
        nationalPhoneNumber?: string;
      }>;
    };
  }

  let json = await searchPlaces("restaurant");
  if (!json?.places?.length) {
    json = await searchPlaces("website");
  }
  if (!json?.places?.length) return null;

  const places = json.places ?? [];
  const ranked = places
    .filter((p) => p.id && nameMatches(restaurantName, p.displayName?.text ?? ""))
    .sort((a, b) => (b.userRatingCount ?? 0) - (a.userRatingCount ?? 0));

  const pick = ranked[0] ?? places[0];
  if (!pick?.id) return null;

  const placeId = pick.id.replace(/^places\//, "");
  let websiteUrl = pick.websiteUri?.trim() || null;
  let phoneNumber = pick.nationalPhoneNumber?.trim() || null;

  for (const candidate of ranked.length ? ranked : places) {
    if (websiteUrl) break;
    const id = candidate.id?.replace(/^places\//, "");
    if (!id) continue;
    if (candidate.websiteUri?.trim()) {
      websiteUrl = candidate.websiteUri.trim();
      break;
    }
    const details = await placesPlaceDetailsNew(id);
    if (details?.websiteUri) {
      websiteUrl = details.websiteUri;
      break;
    }
  }

  if (!websiteUrl) {
    const details = await placesPlaceDetailsNew(placeId);
    websiteUrl = details?.websiteUri ?? null;
    phoneNumber = phoneNumber ?? details?.phoneNumber ?? null;
  }

  if (!websiteUrl) {
    const withWebsite = await searchPlaces("website");
    if (withWebsite?.places?.length && !websiteUrl) {
      for (const candidate of withWebsite.places) {
        const uri = candidate.websiteUri?.trim();
        if (uri && nameMatches(restaurantName, candidate.displayName?.text ?? "")) {
          websiteUrl = uri;
          break;
        }
      }
    }
  }

  const enrichment = await placesPlaceAuditEnrichment(placeId);

  return {
    placeId,
    name: pick.displayName?.text ?? restaurantName,
    city,
    formattedAddress: pick.formattedAddress ?? "",
    websiteUrl,
    phoneNumber,
    rating: pick.rating ?? enrichment?.rating ?? null,
    reviewCount: pick.userRatingCount ?? enrichment?.reviewCount ?? null,
    lastReviewAt: parseLastReviewAt(enrichment?.reviews ?? []),
  };
}
