import { cityFromFormattedAddress } from "@/lib/audit/create-pending-audit";
import { extractLocationFromHtml } from "@/lib/audit/extract-location-from-html";
import type { AuditGeoLocation } from "@/lib/audit/types";
import {
  placesFindByWebsite,
  placesGeocodeCityUk,
  placesPlaceDetailsNew,
} from "@/lib/places/google-places-server";

export type { AuditGeoLocation };

export type ResolveAuditLocationInput = {
  html?: string | null;
  websiteUrl: string;
  restaurantName: string;
  /** From audit start when user picked a Google listing */
  place?: {
    name?: string;
    placeId?: string;
    formattedAddress?: string;
    lat?: number | null;
    lng?: number | null;
  } | null;
  fallbackCity: string;
};

export async function resolveAuditLocation(input: ResolveAuditLocationInput): Promise<AuditGeoLocation | null> {
  const place = input.place;
  if (place?.lat != null && place?.lng != null && Number.isFinite(place.lat) && Number.isFinite(place.lng)) {
    const city = place.formattedAddress?.trim()
      ? cityFromFormattedAddress(place.formattedAddress)
      : input.fallbackCity;
    return {
      lat: place.lat,
      lng: place.lng,
      city: city !== "Your area" ? city : input.fallbackCity,
      source: "place_input",
      placeId: place.placeId,
    };
  }

  if (place?.placeId?.trim()) {
    const details = await placesPlaceDetailsNew(place.placeId.trim());
    if (details?.lat != null && details?.lng != null) {
      const city = cityFromFormattedAddress(details.formattedAddress);
      return {
        lat: details.lat,
        lng: details.lng,
        city: city !== "Your area" ? city : input.fallbackCity,
        source: "place_input",
        placeId: details.placeId,
      };
    }
  }

  if (input.html) {
    const hint = extractLocationFromHtml(input.html);
    if (hint?.lat != null && hint?.lng != null) {
      return {
        lat: hint.lat,
        lng: hint.lng,
        city: hint.city ?? input.fallbackCity,
        source: hint.source,
      };
    }
    if (hint?.city?.trim()) {
      const geocoded = await placesGeocodeCityUk(hint.city, input.restaurantName);
      if (geocoded) {
        return {
          lat: geocoded.lat,
          lng: geocoded.lng,
          city: geocoded.city !== "Your area" ? geocoded.city : input.fallbackCity,
          source: "places_website",
          placeId: geocoded.placeId,
        };
      }
    }
  }

  const fromWebsite = await placesFindByWebsite(input.websiteUrl, input.restaurantName);
  if (fromWebsite) {
    return {
      lat: fromWebsite.lat,
      lng: fromWebsite.lng,
      city: fromWebsite.city !== "Your area" ? fromWebsite.city : input.fallbackCity,
      source: "places_website",
      placeId: fromWebsite.placeId,
    };
  }

  if (input.fallbackCity.trim() && input.fallbackCity !== "Your area") {
    const geocoded = await placesGeocodeCityUk(input.fallbackCity, input.restaurantName);
    if (geocoded) {
      return {
        lat: geocoded.lat,
        lng: geocoded.lng,
        city: geocoded.city,
        source: "places_website",
        placeId: geocoded.placeId,
      };
    }
  }

  return null;
}
