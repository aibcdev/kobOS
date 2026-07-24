import { buildJustEatMenuPath } from "@/lib/lead-engine/justeat-menu-url";
import { buildCanonicalKey } from "@/lib/lead-engine/normalize-name";
import { getLeadEngineConfig } from "@/lib/lead-engine/config";
import { isExcludedFromOutboundIcp } from "@/lib/outbound/chain-denylist";
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
  justEatMenuUrl: string | null;
  deliverooMenuUrl: string | null;
  uberEatsMenuUrl: string | null;
  address: string | null;
};

export function mergePlatformListings(listings: PlatformListing[]): MergedPlatformLead[] {
  const config = getLeadEngineConfig();
  const topPct = config.platformTopPct / 100;
  const byKey = new Map<string, MergedPlatformLead>();

  for (const l of listings) {
    if (l.isBrand) continue;
    if (l.rankPercentile > topPct) continue;
    if (isExcludedFromOutboundIcp(l.name, null)) continue;

    const canonicalKey = buildCanonicalKey(l.name, l.city);
    const existing = byKey.get(canonicalKey);

    const jeUrl =
      l.platform === "justeat" ? l.url?.trim() || buildJustEatMenuPath(l.name, l.city) : null;
    const drUrl = l.platform === "deliveroo" ? l.url?.trim() || null : null;
    const ueUrl = l.platform === "ubereats" ? l.url?.trim() || null : null;

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
        platformUrl: l.url ?? jeUrl ?? drUrl ?? ueUrl,
        justEatMenuUrl: jeUrl,
        deliverooMenuUrl: drUrl,
        uberEatsMenuUrl: ueUrl,
        address: l.address,
      });
      continue;
    }

    if (!existing.deliveryPlatforms.includes(l.platform)) {
      existing.deliveryPlatforms.push(l.platform);
    }
    if ((l.reviewCount ?? 0) > (existing.platformReviewCount ?? 0)) {
      existing.platformReviewCount = l.reviewCount;
    }
    if (l.platform === "justeat") {
      existing.justEatMenuUrl = jeUrl ?? existing.justEatMenuUrl;
    }
    if (l.platform === "deliveroo" && drUrl) {
      existing.deliverooMenuUrl = drUrl;
    }
    if (l.platform === "ubereats" && ueUrl) {
      existing.uberEatsMenuUrl = ueUrl;
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
