import { isExcludedFromOutboundIcp } from "@/lib/outbound/chain-denylist";
import { getLeadEngineConfig } from "@/lib/lead-engine/config";
import { isFastFoodOrPubFormat, passesHighStreetRestaurantIcp } from "@/lib/lead-engine/high-street-icp";
import {
  classifyRestaurant,
  formatClassifierReject,
  type RestaurantClassifierResult,
} from "@/lib/lead-engine/restaurant-classifier";

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
  /** Google Places types / primaryType (normalized). */
  categories?: string[] | null;
  description?: string | null;
  websiteText?: string | null;
  hasDineIn?: boolean | null;
  reviewTexts?: string[] | null;
};

export type IcpFilterResult =
  | { ok: true; ratingBand: "ideal" | "low"; classifier?: RestaurantClassifierResult }
  | { ok: false; reason: string; classifier?: RestaurantClassifierResult };

export function effectiveReviewCount(candidate: IcpCandidate): number {
  return Math.max(candidate.reviewCount ?? 0, candidate.platformReviewCount ?? 0);
}

export function passesReviewThreshold(candidate: IcpCandidate): boolean {
  const icp = getLeadEngineConfig();
  return (candidate.reviewCount ?? 0) >= icp.googleReviewMin;
}

/**
 * Restaurant classifier → format/ICP gates.
 * Email is a pipeline step (enrich), not ICP.
 */
export function passesLeadIcpFilters(candidate: IcpCandidate): IcpFilterResult {
  const classifier = classifyRestaurant({
    name: candidate.name,
    categories: candidate.categories,
    description: candidate.description,
    websiteText: candidate.websiteText,
    hasDineIn: candidate.hasDineIn,
    reviewTexts: candidate.reviewTexts,
  });

  if (!classifier.is_restaurant) {
    console.warn(formatClassifierReject(candidate.name, classifier));
    return { ok: false, reason: `not_restaurant:${classifier.flags[0] ?? "rejected"}`, classifier };
  }

  const icp = getLeadEngineConfig();

  if (isExcludedFromOutboundIcp(candidate.name, candidate.websiteUrl ?? null)) {
    return { ok: false, reason: "chain_or_elite", classifier };
  }

  if (isFastFoodOrPubFormat(candidate.name)) {
    return { ok: false, reason: "fast_food_or_pub", classifier };
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
  if (!hs.ok) return { ok: false, reason: hs.reason, classifier };

  if (isStrictLeadIcp() && candidate.platformRankPercentile != null) {
    const topPct = icp.platformTopPct / 100;
    if (candidate.platformRankPercentile > topPct) {
      return { ok: false, reason: "platform_rank_low", classifier };
    }
  }

  if (!passesReviewThreshold(candidate)) {
    return { ok: false, reason: "reviews_too_low", classifier };
  }

  if (candidate.locationCount != null && candidate.locationCount > icp.locationMax) {
    return { ok: false, reason: "too_many_locations", classifier };
  }

  if (candidate.rating != null && candidate.rating < icp.ratingMin) {
    return { ok: false, reason: "rating_too_low", classifier };
  }

  const rating = candidate.rating;
  const ratingBand: "ideal" | "low" =
    rating != null && rating < 4.2 ? "ideal" : "low";

  return { ok: true, ratingBand, classifier };
}
