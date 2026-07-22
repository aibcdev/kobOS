import type { PlatformListing } from "@/lib/lead-engine/scrapers/types";
import { postcodesForCity } from "@/lib/lead-engine/scrapers/uk-postcodes";
import { fetchUberFeedForLocation } from "@/lib/lead-engine/scrapers/uber-feed-api";

function postcodesPerCity(): number {
  return Math.min(
    10,
    Math.max(4, Number(process.env.LEAD_ENGINE_UE_POSTCODES_PER_CITY?.trim() || "8") || 8),
  );
}

export async function scrapeUberEatsForCity(
  city: string,
  country: "GB" | "IE" = "GB",
): Promise<PlatformListing[]> {
  const postcodes = postcodesForCity(city).slice(0, postcodesPerCity());
  const out: PlatformListing[] = [];
  const seen = new Set<string>();

  for (const postcode of postcodes) {
    try {
      const stores = await fetchUberFeedForLocation(postcode, city, country);
      const total = stores.length;
      if (!total) continue;

      stores.forEach((s, idx) => {
        const name = s.title?.trim();
        if (!name || /uber eats|nothing to eat|categories in|sign in/i.test(name)) return;
        const key = `${name.toLowerCase()}|${postcode}`;
        if (seen.has(key)) return;
        seen.add(key);

        const rank = idx + 1;
        out.push({
          platform: "ubereats",
          platformId: s.uuid,
          name,
          city,
          country,
          rank,
          totalInRegion: total,
          rankPercentile: rank / total,
          platformRegion: postcode,
          rating: s.ratingValue,
          reviewCount: s.reviewCount,
          url: s.actionUrl ? `https://www.ubereats.com${s.actionUrl}` : null,
          address: null,
          isBrand: false,
        });
      });
    } catch {
      continue;
    }
  }

  return out;
}
