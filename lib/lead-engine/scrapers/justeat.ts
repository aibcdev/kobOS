import type { PlatformListing } from "@/lib/lead-engine/scrapers/types";
import { postcodesForCity } from "@/lib/lead-engine/scrapers/uk-postcodes";

type JeRestaurant = {
  Id?: number;
  Name?: string;
  IsBrand?: boolean;
  IsTestRestaurant?: boolean;
  URL?: string;
  Address?: {
    FirstLine?: string;
    City?: string;
    Postcode?: string;
  };
  Rating?: { Count?: number; Average?: number };
  DefaultDisplayRank?: number;
};

type JeResponse = {
  Restaurants?: JeRestaurant[];
};

function postcodesPerCity(): number {
  return Math.min(
    12,
    Math.max(3, Number(process.env.LEAD_ENGINE_JE_POSTCODES_PER_CITY?.trim() || "8") || 8),
  );
}

export async function scrapeJustEatForCity(
  city: string,
  country: "GB" | "IE" = "GB",
  maxPerPostcode = 60,
): Promise<PlatformListing[]> {
  const postcodes = postcodesForCity(city).slice(0, postcodesPerCity());
  const out: PlatformListing[] = [];

  for (const postcode of postcodes) {
    const apiPostcode = country === "IE" ? postcode : postcode;
    const url =
      country === "IE"
        ? `https://ie.api.just-eat.io/restaurants/bypostcode/${encodeURIComponent(apiPostcode)}`
        : `https://uk.api.just-eat.io/restaurants/bypostcode/${encodeURIComponent(apiPostcode)}`;

    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "KOB-LeadEngine/1.0" },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) continue;
      const json = (await res.json()) as JeResponse;
      const restaurants = (json.Restaurants ?? []).filter(
        (r) => r.Name && !r.IsTestRestaurant && !r.IsBrand,
      );
      const total = restaurants.length;
      if (!total) continue;

      restaurants.slice(0, maxPerPostcode).forEach((r, idx) => {
        const rank = r.DefaultDisplayRank ?? idx + 1;
        out.push({
          platform: "justeat",
          platformId: String(r.Id ?? `${postcode}-${idx}`),
          name: r.Name!.trim(),
          city,
          country,
          rank,
          totalInRegion: total,
          rankPercentile: rank / total,
          platformRegion: postcode,
          rating: r.Rating?.Average ?? null,
          reviewCount: r.Rating?.Count ?? null,
          url: r.URL ?? null,
          address: [r.Address?.FirstLine, r.Address?.City, r.Address?.Postcode]
            .filter(Boolean)
            .join(", "),
          isBrand: Boolean(r.IsBrand),
        });
      });
    } catch {
      continue;
    }
  }

  return out;
}
