import type { PlatformListing } from "@/lib/lead-engine/scrapers/types";
import { cityLatLngGrid, citySlug } from "@/lib/lead-engine/scrapers/uk-postcodes";
import { extractNextDataJson, fetchHtml } from "@/lib/lead-engine/scrapers/fetch-html";

function encodeGeohash(lat: number, lng: number): string {
  const chars = "0123456789bcdefghjkmnpqrstuvwxyz";
  let minLat = -90,
    maxLat = 90,
    minLng = -180,
    maxLng = 180;
  let hash = "";
  let bit = 0;
  let ch = 0;
  let even = true;
  while (hash.length < 9) {
    if (even) {
      const mid = (minLng + maxLng) / 2;
      if (lng >= mid) {
        ch |= 1 << (4 - bit);
        minLng = mid;
      } else maxLng = mid;
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) {
        ch |= 1 << (4 - bit);
        minLat = mid;
      } else maxLat = mid;
    }
    even = !even;
    if (bit < 4) bit++;
    else {
      hash += chars[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}

type RooBlock = {
  target?: {
    restaurant?: {
      id?: string;
      name?: string;
      rating?: { formatted_rating?: string; count?: string };
      links?: { self?: { href?: string } };
    };
  };
};

export async function scrapeDeliverooForCity(
  city: string,
  country: "GB" | "IE" = "GB",
): Promise<PlatformListing[]> {
  if (country === "IE") return [];
  const slug = citySlug(city);
  const grid = cityLatLngGrid(city).slice(0, 2);
  const out: PlatformListing[] = [];

  for (const { lat, lng } of grid) {
    const geohash = encodeGeohash(lat, lng);
    const url = `https://deliveroo.co.uk/restaurants/${slug}/${slug}?geohash=${geohash}&collection=all-restaurants`;
    const html = await fetchHtml(url);
    if (!html) continue;

    const data = extractNextDataJson(html) as {
      props?: {
        initialState?: {
          home?: {
            feed?: {
              results?: { data?: Array<{ blocks?: RooBlock[] }> };
            };
          };
        };
      };
    } | null;

    const blocks =
      data?.props?.initialState?.home?.feed?.results?.data?.flatMap((d) => d.blocks ?? []) ?? [];

    const restaurants = blocks
      .map((b) => b.target?.restaurant)
      .filter((r): r is NonNullable<typeof r> => Boolean(r?.name && r?.id));

    const total = restaurants.length;
    if (!total) continue;

    restaurants.forEach((r, idx) => {
      const rank = idx + 1;
      const ratingStr = r.rating?.formatted_rating;
      const countStr = r.rating?.count?.replace(/\D/g, "");
      out.push({
        platform: "deliveroo",
        platformId: r.id!,
        name: r.name!.trim(),
        city,
        country: "GB",
        rank,
        totalInRegion: total,
        rankPercentile: rank / total,
        platformRegion: geohash,
        rating: ratingStr ? Number(ratingStr) : null,
        reviewCount: countStr ? Number(countStr) : null,
        url: r.links?.self?.href
          ? `https://deliveroo.co.uk${r.links.self.href}`
          : null,
        address: null,
        isBrand: false,
      });
    });
  }

  return out;
}
