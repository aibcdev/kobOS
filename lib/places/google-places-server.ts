import { auditPlacesRegionCodes } from "@/lib/places/audit-places-config";

const AUTocomplete_URL = "https://places.googleapis.com/v1/places:autocomplete";

export type PlaceSuggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
};

export type PlaceDetailsResult = {
  placeId: string;
  name: string;
  formattedAddress: string;
  websiteUri: string | null;
  phoneNumber: string | null;
  lat: number | null;
  lng: number | null;
};

function getApiKey(): string | null {
  const k = process.env.GOOGLE_PLACES_API_KEY?.trim();
  return k || null;
}

function regionCodesFromEnv(): string[] | undefined {
  const codes = auditPlacesRegionCodes();
  return codes.length ? codes : undefined;
}

export async function placesAutocompleteNew(input: string): Promise<PlaceSuggestion[]> {
  const key = getApiKey();
  if (!key || input.trim().length < 3) return [];

  const includedRegionCodes = regionCodesFromEnv();

  const res = await fetch(AUTocomplete_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
    },
    body: JSON.stringify({
      input: input.trim().slice(0, 200),
      languageCode: "en",
      ...(includedRegionCodes ? { includedRegionCodes } : {}),
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.warn("[places] autocomplete HTTP", res.status, errText.slice(0, 200));
    return [];
  }

  const json = (await res.json()) as {
    suggestions?: Array<{
      placePrediction?: {
        place?: string;
        placeId?: string;
        structuredFormat?: {
          mainText?: { text?: string };
          secondaryText?: { text?: string };
        };
        text?: { text?: string };
      };
    }>;
  };

  const out: PlaceSuggestion[] = [];
  for (const s of json.suggestions ?? []) {
    const p = s.placePrediction;
    if (!p) continue;
    const placeId =
      p.placeId ||
      (typeof p.place === "string" && p.place.startsWith("places/") ? p.place.slice("places/".length) : null);
    if (!placeId) continue;
    const mainText = p.structuredFormat?.mainText?.text ?? p.text?.text ?? "Place";
    const secondaryText = p.structuredFormat?.secondaryText?.text ?? "";
    out.push({ placeId, mainText, secondaryText });
    if (out.length >= 8) break;
  }
  return out;
}

export async function placesPlaceDetailsNew(placeId: string): Promise<PlaceDetailsResult | null> {
  const key = getApiKey();
  if (!key || !placeId.trim()) return null;

  const id = placeId.trim();
  const pathId = encodeURIComponent(id);
  const url = `https://places.googleapis.com/v1/places/${pathId}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "id,displayName,formattedAddress,websiteUri,location,nationalPhoneNumber",
    },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.warn("[places] details HTTP", res.status, errText.slice(0, 200));
    return null;
  }

  const json = (await res.json()) as {
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    websiteUri?: string;
    location?: { latitude?: number; longitude?: number };
    nationalPhoneNumber?: string;
  };

  const lat = json.location?.latitude ?? null;
  const lng = json.location?.longitude ?? null;

  return {
    placeId: json.id ?? id,
    name: json.displayName?.text ?? "Restaurant",
    formattedAddress: json.formattedAddress ?? "",
    websiteUri: json.websiteUri?.trim() ? json.websiteUri.trim() : null,
    phoneNumber: json.nationalPhoneNumber?.trim() ? json.nationalPhoneNumber.trim() : null,
    lat,
    lng,
  };
}

/** Reviews + rating for perception audit enrichment. */
export async function placesPlaceAuditEnrichment(
  placeId: string,
): Promise<import("@/lib/audit/evidence-pack").AuditGooglePlaceEvidence | null> {
  const key = getApiKey();
  if (!key || !placeId.trim()) return null;

  const id = placeId.trim();
  const pathId = encodeURIComponent(id);
  const url = `https://places.googleapis.com/v1/places/${pathId}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "id,rating,userRatingCount,photos,reviews",
    },
  });

  if (!res.ok) {
    console.warn("[places] audit enrichment HTTP", res.status);
    return null;
  }

  const json = (await res.json()) as {
    id?: string;
    rating?: number;
    userRatingCount?: number;
    photos?: unknown[];
    reviews?: Array<{
      text?: { text?: string };
      rating?: number;
      publishTime?: string;
    }>;
  };

  const reviews = (json.reviews ?? [])
    .map((r) => ({
      text: (r.text?.text ?? "").trim().slice(0, 500),
      rating: typeof r.rating === "number" ? r.rating : 0,
      publishTime: r.publishTime ?? null,
    }))
    .filter((r) => r.text.length > 0)
    .slice(0, 8);

  return {
    placeId: json.id ?? id,
    rating: json.rating ?? null,
    reviewCount: json.userRatingCount ?? null,
    photoCount: json.photos?.length ?? 0,
    reviews,
  };
}

export type NearbyPlace = {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  rating: number | null;
  userRatingCount: number | null;
};

function hostFromWebsiteUrl(raw: string): string {
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return u.hostname.replace(/^www\./i, "");
  } catch {
    return raw.replace(/^https?:\/\//i, "").split("/")[0] ?? raw;
  }
}

/** Text search to locate a business from its public website / name. */
export async function placesFindByWebsite(
  websiteUrl: string,
  restaurantName: string,
): Promise<{ placeId: string; lat: number; lng: number; city: string } | null> {
  const key = getApiKey();
  if (!key) return null;

  const host = hostFromWebsiteUrl(websiteUrl);
  const textQuery = `${restaurantName} ${host}`.trim().slice(0, 200);

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.websiteUri",
    },
    body: JSON.stringify({
      textQuery,
      languageCode: "en-GB",
      maxResultCount: 5,
      includedType: "restaurant",
      regionCode: auditPlacesRegionCodes()[0] ?? "GB",
    }),
  });

  if (!res.ok) {
    console.warn("[places] searchText HTTP", res.status);
    return null;
  }

  const json = (await res.json()) as {
    places?: Array<{
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      websiteUri?: string;
      location?: { latitude?: number; longitude?: number };
    }>;
  };

  const hostNorm = host.toLowerCase();
  const pick =
    json.places?.find((p) => {
      const uri = p.websiteUri?.toLowerCase() ?? "";
      return uri.includes(hostNorm);
    }) ?? json.places?.[0];

  if (!pick?.location?.latitude || !pick.location.longitude) return null;

  const { cityFromFormattedAddress } = await import("@/lib/audit/create-pending-audit");
  const city = cityFromFormattedAddress(pick.formattedAddress ?? "");

  return {
    placeId: pick.id ?? "",
    lat: pick.location.latitude,
    lng: pick.location.longitude,
    city,
  };
}

/** Nearby restaurants for competitor comparison (excludes self when name matches). */
export async function placesSearchNearbyRestaurants(
  lat: number,
  lng: number,
  excludeName?: string,
  maxResults = 4,
): Promise<NearbyPlace[]> {
  const key = getApiKey();
  if (!key) return [];

  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.location,places.rating,places.userRatingCount",
    },
    body: JSON.stringify({
      includedTypes: ["restaurant"],
      languageCode: "en-GB",
      regionCode: auditPlacesRegionCodes()[0] ?? "GB",
      maxResultCount: Math.min(10, maxResults + 2),
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: 5000,
        },
      },
    }),
  });

  if (!res.ok) {
    console.warn("[places] searchNearby HTTP", res.status);
    return [];
  }

  const json = (await res.json()) as {
    places?: Array<{
      id?: string;
      displayName?: { text?: string };
      location?: { latitude?: number; longitude?: number };
      rating?: number;
      userRatingCount?: number;
    }>;
  };

  const exclude = excludeName?.trim().toLowerCase();
  const excludeTokens = exclude ? exclude.split(/\s+/).filter((t) => t.length > 2) : [];
  const out: NearbyPlace[] = [];

  for (const p of json.places ?? []) {
    const name = p.displayName?.text?.trim();
    const plat = p.location?.latitude;
    const plng = p.location?.longitude;
    if (!name || plat == null || plng == null) continue;
    const nameLower = name.toLowerCase();
    if (exclude && (nameLower === exclude || nameLower.includes(exclude) || exclude.includes(nameLower))) {
      continue;
    }
    if (excludeTokens.length && excludeTokens.every((t) => nameLower.includes(t))) continue;
    out.push({
      placeId: p.id ?? name,
      name,
      lat: plat,
      lng: plng,
      rating: p.rating ?? null,
      userRatingCount: p.userRatingCount ?? null,
    });
    if (out.length >= maxResults) break;
  }

  return out;
}

/** Geocode a UK city (and optional business name) when we have city text but no coordinates. */
export async function placesGeocodeCityUk(
  city: string,
  restaurantName?: string,
): Promise<{ lat: number; lng: number; city: string; placeId?: string } | null> {
  const key = getApiKey();
  const cityTrim = city.trim();
  if (!key || !cityTrim || cityTrim === "Your area") return null;

  const textQuery = restaurantName?.trim()
    ? `${restaurantName} ${cityTrim} UK restaurant`.trim().slice(0, 200)
    : `restaurants in ${cityTrim} UK`.slice(0, 200);

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location",
    },
    body: JSON.stringify({
      textQuery,
      languageCode: "en-GB",
      maxResultCount: 3,
      includedType: "restaurant",
      regionCode: "GB",
    }),
  });

  if (!res.ok) {
    console.warn("[places] geocode city HTTP", res.status);
    return null;
  }

  const json = (await res.json()) as {
    places?: Array<{
      id?: string;
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
    }>;
  };

  const pick = json.places?.find((p) => p.location?.latitude != null && p.location?.longitude != null);
  if (!pick?.location?.latitude || pick.location.longitude == null) return null;

  const { cityFromFormattedAddress } = await import("@/lib/audit/create-pending-audit");
  const resolvedCity = cityFromFormattedAddress(pick.formattedAddress ?? "") || cityTrim;

  return {
    lat: pick.location.latitude,
    lng: pick.location.longitude,
    city: resolvedCity,
    placeId: pick.id,
  };
}
