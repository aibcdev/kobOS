import { isLikelyChainRestaurant } from "@/lib/outbound/chain-denylist";
import { getLeadEngineConfig } from "@/lib/lead-engine/config";

export type IcpCandidate = {
  name: string;
  websiteUrl: string | null;
  userRatingCount: number | null;
  rating: number | null;
  lastReviewAt: Date | null;
  instagramFollowers?: number | null;
  locationCount?: number | null;
  platformRankPercentile?: number | null;
  websiteStale?: boolean;
};

export type IcpFilterResult =
  | { ok: true; ratingBand: "ideal" | "low" }
  | { ok: false; reason: string };

export function passesLeadIcpFilters(candidate: IcpCandidate): IcpFilterResult {
  const icp = getLeadEngineConfig();

  if (icp.requireWebsite && !candidate.websiteUrl?.trim()) {
    return { ok: false, reason: "no_website" };
  }

  const reviews = candidate.userRatingCount ?? 0;
  if (reviews < icp.reviewMin) return { ok: false, reason: "reviews_too_low" };
  if (reviews > icp.reviewMax) return { ok: false, reason: "reviews_too_high" };

  if (isLikelyChainRestaurant(candidate.name, candidate.websiteUrl)) {
    return { ok: false, reason: "chain" };
  }

  const rating = candidate.rating;
  if (rating == null) return { ok: false, reason: "no_rating" };
  if (rating < icp.ratingMin) return { ok: false, reason: "rating_below_min" };
  if (rating >= icp.ratingMax) return { ok: false, reason: "rating_too_high" };

  const ratingBand: "ideal" | "low" =
    rating >= 4.1 && rating < icp.ratingMax ? "ideal" : "low";

  const requirePlatform = process.env.LEAD_ENGINE_REQUIRE_PLATFORM?.trim() !== "0";
  if (requirePlatform && candidate.platformRankPercentile == null) {
    return { ok: false, reason: "no_platform_rank" };
  }

  if (candidate.platformRankPercentile != null) {
    const topPct = icp.platformTopPct / 100;
    if (candidate.platformRankPercentile > topPct) {
      return { ok: false, reason: "platform_rank_low" };
    }
  }

  if (candidate.locationCount != null && candidate.locationCount > icp.locationMax) {
    return { ok: false, reason: "too_many_locations" };
  }

  if (
    candidate.instagramFollowers != null &&
    candidate.instagramFollowers >= icp.instagramMax
  ) {
    return { ok: false, reason: "instagram_too_large" };
  }

  if (icp.requireStaleWebsite && candidate.websiteStale === false) {
    return { ok: false, reason: "website_not_stale" };
  }

  const requireRecent =
    process.env.LEAD_ENGINE_REQUIRE_RECENT_REVIEWS?.trim() === "1";
  if (requireRecent && candidate.lastReviewAt) {
    const cutoff = Date.now() - icp.requireRecentReviewDays * 86_400_000;
    if (candidate.lastReviewAt.getTime() < cutoff) {
      return { ok: false, reason: "stale_reviews" };
    }
  }

  return { ok: true, ratingBand };
}
