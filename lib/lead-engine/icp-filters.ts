import { isExcludedFromOutboundIcp } from "@/lib/outbound/chain-denylist";
import { getLeadEngineConfig } from "@/lib/lead-engine/config";
import { isFastFoodOrPubFormat, passesHighStreetRestaurantIcp } from "@/lib/lead-engine/high-street-icp";

export function isStrictLeadIcp(): boolean {
  return process.env.LEAD_ENGINE_STRICT_ICP?.trim() === "1";
}

export type IcpCandidate = {
  name: string;
  websiteUrl?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  rating: number | null;
  reviewCount?: number | null;
  platformReviewCount?: number | null;
  locationCount?: number | null;
  platformRankPercentile?: number | null;
  lastReviewAt?: Date | string | null;
  instagramUrl?: string | null;
  instagramPostGapDays?: number | null;
  businessType?: string | null;
  deliveryPlatforms?: string[] | null;
  hasOnlineOrdering?: boolean | null;
};

export type IcpFilterResult =
  | { ok: true; ratingBand: "ideal" | "low" }
  | { ok: false; reason: string };

export function effectiveReviewCount(candidate: IcpCandidate): number {
  return Math.max(candidate.reviewCount ?? 0, candidate.platformReviewCount ?? 0);
}

export function passesReviewThreshold(candidate: IcpCandidate): boolean {
  const icp = getLeadEngineConfig();
  // Hard floor: Google reviews (not platform-only)
  return (candidate.reviewCount ?? 0) >= icp.googleReviewMin;
}

/** High-street independent restaurant ICP for outbound. */
export function passesLeadIcpFilters(candidate: IcpCandidate): IcpFilterResult {
  const icp = getLeadEngineConfig();

  if (isExcludedFromOutboundIcp(candidate.name, candidate.websiteUrl ?? null)) {
    return { ok: false, reason: "chain_or_elite" };
  }

  if (isFastFoodOrPubFormat(candidate.name)) {
    return { ok: false, reason: "fast_food_or_pub" };
  }

  const hs = passesHighStreetRestaurantIcp({
    name: candidate.name,
    websiteUrl: candidate.websiteUrl,
    reviewCount: candidate.reviewCount,
    googleReviewMin: icp.googleReviewMin,
    lastReviewAt: candidate.lastReviewAt,
    instagramUrl: candidate.instagramUrl,
    instagramPostGapDays: candidate.instagramPostGapDays,
    businessType: candidate.businessType,
    deliveryPlatforms: candidate.deliveryPlatforms,
    hasOnlineOrdering: candidate.hasOnlineOrdering,
  });
  if (!hs.ok) return { ok: false, reason: hs.reason };

  const topPct = icp.platformTopPct / 100;

  if (candidate.platformRankPercentile === undefined) {
    // Google-only discovery — no delivery platform rank available.
  } else if (candidate.platformRankPercentile == null) {
    return { ok: false, reason: "no_platform_rank" };
  } else if (candidate.platformRankPercentile > topPct) {
    return { ok: false, reason: "platform_rank_low" };
  }

  if (!passesReviewThreshold(candidate)) {
    return { ok: false, reason: "reviews_too_low" };
  }

  if (candidate.locationCount != null && candidate.locationCount > icp.locationMax) {
    return { ok: false, reason: "too_many_locations" };
  }

  if (!candidate.contactEmail?.trim()) {
    return { ok: false, reason: "no_email" };
  }

  const rating = candidate.rating;
  const ratingBand: "ideal" | "low" =
    rating != null && rating < 4.2 ? "ideal" : "low";

  return { ok: true, ratingBand };
}
