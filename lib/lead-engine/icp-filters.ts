import { isLikelyChainRestaurant } from "@/lib/outbound/chain-denylist";
import { getLeadEngineConfig } from "@/lib/lead-engine/config";

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
};

export type IcpFilterResult =
  | { ok: true; ratingBand: "ideal" | "low" }
  | { ok: false; reason: string };

export function effectiveReviewCount(candidate: IcpCandidate): number {
  return Math.max(candidate.reviewCount ?? 0, candidate.platformReviewCount ?? 0);
}

export function passesReviewThreshold(candidate: IcpCandidate): boolean {
  const icp = getLeadEngineConfig();
  const googleReviews = candidate.reviewCount ?? 0;
  const platformReviews = candidate.platformReviewCount ?? 0;
  return googleReviews >= icp.googleReviewMin || platformReviews >= icp.reviewMin;
}

/** Top 20% delivery, 40+ Google OR 50+ platform reviews, email required, ≤3 loc, not a chain. */
export function passesLeadIcpFilters(candidate: IcpCandidate): IcpFilterResult {
  const icp = getLeadEngineConfig();

  if (isLikelyChainRestaurant(candidate.name, candidate.websiteUrl ?? null)) {
    return { ok: false, reason: "chain" };
  }

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
