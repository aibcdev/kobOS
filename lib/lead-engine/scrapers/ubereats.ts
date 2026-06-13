import type { PlatformListing } from "@/lib/lead-engine/scrapers/types";
import { citySlug } from "@/lib/lead-engine/scrapers/uk-postcodes";
import { extractNextDataJson, fetchHtml } from "@/lib/lead-engine/scrapers/fetch-html";

type UberStore = {
  uuid?: string;
  title?: string;
  rating?: { ratingValue?: number; reviewCount?: string };
  actionUrl?: string;
  location?: { address?: string };
};

export async function scrapeUberEatsForCity(
  city: string,
  country: "GB" | "IE" = "GB",
): Promise<PlatformListing[]> {
  const slug = citySlug(city);
  const region = country === "IE" ? "ie" : "gb";
  const url = `https://www.ubereats.com/${region}/${slug}`;
  const html = await fetchHtml(url);
  if (!html) return [];

  const data = extractNextDataJson(html);
  const stores = findUberStores(data);
  const total = stores.length;
  if (!total) return [];

  return stores.map((s, idx) => {
    const rank = idx + 1;
    const reviewRaw = s.rating?.reviewCount?.replace(/\D/g, "");
    return {
      platform: "ubereats",
      platformId: s.uuid ?? `${slug}-${idx}`,
      name: (s.title ?? "Unknown").trim(),
      city,
      country,
      rank,
      totalInRegion: total,
      rankPercentile: rank / total,
      platformRegion: slug,
      rating: s.rating?.ratingValue ?? null,
      reviewCount: reviewRaw ? Number(reviewRaw) : null,
      url: s.actionUrl ? `https://www.ubereats.com${s.actionUrl}` : null,
      address: s.location?.address ?? null,
      isBrand: false,
    };
  });
}

function findUberStores(node: unknown, acc: UberStore[] = [], depth = 0): UberStore[] {
  if (!node || depth > 14 || acc.length > 80) return acc;
  if (Array.isArray(node)) {
    for (const item of node) findUberStores(item, acc, depth + 1);
    return acc;
  }
  if (typeof node === "object") {
    const o = node as Record<string, unknown>;
    if (typeof o.title === "string" && (o.uuid || o.actionUrl)) {
      acc.push(o as UberStore);
    }
    for (const v of Object.values(o)) findUberStores(v, acc, depth + 1);
  }
  return acc;
}
