import { buildCanonicalKey } from "@/lib/lead-engine/normalize-name";
import { getLeadEngineConfig } from "@/lib/lead-engine/config";
import { isLikelyChainRestaurant } from "@/lib/outbound/chain-denylist";
import type { DeliveryPlatform, PlatformListing } from "@/lib/lead-engine/scrapers/types";

export type MergedPlatformLead = {
  canonicalKey: string;
  name: string;
  city: string;
  country: "GB" | "IE";
  deliveryPlatforms: DeliveryPlatform[];
  platformRank: number;
  platformRankPercentile: number;
  platformRegion: string;
  platformRating: number | null;
  platformReviewCount: number | null;
  platformUrl: string | null;
  address: string | null;
};

export function mergePlatformListings(listings: PlatformListing[]): MergedPlatformLead[] {
  const config = getLeadEngineConfig();
  const topPct = config.platformTopPct / 100;
  const byKey = new Map<string, MergedPlatformLead>();

  for (const l of listings) {
    if (l.isBrand) continue;
    if (l.rankPercentile > topPct) continue;
    if (isLikelyChainRestaurant(l.name, null)) continue;

    const canonicalKey = buildCanonicalKey(l.name, l.city);
    const existing = byKey.get(canonicalKey);

    if (!existing) {
      byKey.set(canonicalKey, {
        canonicalKey,
        name: l.name,
        city: l.city,
        country: l.country,
        deliveryPlatforms: [l.platform],
        platformRank: l.rank,
        platformRankPercentile: l.rankPercentile,
        platformRegion: l.platformRegion,
        platformRating: l.rating,
        platformReviewCount: l.reviewCount,
        platformUrl: l.url,
        address: l.address,
      });
      continue;
    }

    if (!existing.deliveryPlatforms.includes(l.platform)) {
      existing.deliveryPlatforms.push(l.platform);
    }
    if (l.rankPercentile < existing.platformRankPercentile) {
      existing.platformRank = l.rank;
      existing.platformRankPercentile = l.rankPercentile;
      existing.platformRegion = l.platformRegion;
      existing.platformRating = l.rating;
      existing.platformReviewCount = l.reviewCount;
      existing.platformUrl = l.url;
      if (l.address) existing.address = l.address;
    }
  }

  return [...byKey.values()];
}
