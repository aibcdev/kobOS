import { getLeadEngineConfig } from "@/lib/lead-engine/config";

export type KobScoreInput = {
  reviewCount: number | null;
  rating: number | null;
  ratingBand: "ideal" | "low";
  instagramFollowers: number | null;
  instagramPostGapDays: number | null;
  hasTikTok: boolean;
  weakWebsite: boolean;
  websiteStale: boolean;
  weakPhotography: boolean;
  hasEmailCapture: boolean;
  hasGoogleBusinessPosts: boolean;
  instagramFollowersKnown: boolean;
  locationCount: number | null;
  platformRankPercentile: number | null;
};

export type KobScoreBreakdown = {
  reviews: number;
  rating: number;
  platformRank: number;
  singleLocation: number;
  weakWebsite: number;
  instagram: number;
  tiktok: number;
  photography: number;
  emailCapture: number;
  googleBusinessPosts: number;
  staleWebsite: number;
};

export type KobScoreResult = {
  total: number;
  breakdown: KobScoreBreakdown;
  opportunities: string[];
  disqualifiers: string[];
};

/** Higher score = busier on delivery + lower Google rating (more upside for KOB). */
export function computeKobOpportunityScore(input: KobScoreInput): KobScoreResult {
  const icp = getLeadEngineConfig();
  const breakdown: KobScoreBreakdown = {
    reviews: 0,
    rating: 0,
    platformRank: 0,
    singleLocation: 0,
    weakWebsite: 0,
    instagram: 0,
    tiktok: 0,
    photography: 0,
    emailCapture: 0,
    googleBusinessPosts: 0,
    staleWebsite: 0,
  };
  const opportunities: string[] = [];
  const disqualifiers: string[] = [];

  const reviews = input.reviewCount ?? 0;
  if (reviews >= 50 && reviews <= 500) {
    breakdown.reviews = 20;
  } else if (reviews > 500 && reviews <= 2500) {
    breakdown.reviews = 12;
  } else if (reviews > 2500) {
    breakdown.reviews = 5;
  }

  const rating = input.rating;
  if (rating != null) {
    if (rating < 3.8) {
      breakdown.rating = 25;
      opportunities.push("Low Google rating despite demand — strong visibility upside");
    } else if (rating < 4.2) {
      breakdown.rating = 20;
      opportunities.push("Room to improve reputation and capture more dine-in demand");
    } else if (rating < 4.6) {
      breakdown.rating = 10;
    } else {
      breakdown.rating = 3;
    }
  }

  const pct = input.platformRankPercentile;
  if (pct != null) {
    if (pct <= 0.05) {
      breakdown.platformRank = 25;
      opportunities.push("Top 5% on delivery — proven order volume in the area");
    } else if (pct <= 0.1) {
      breakdown.platformRank = 20;
      opportunities.push("Top 10% on delivery — strong order volume");
    } else if (pct <= 0.2) {
      breakdown.platformRank = 15;
      opportunities.push("Top 20% on delivery — solid demand signal");
    }
  }

  if (input.locationCount === 1) {
    breakdown.singleLocation = 5;
  } else if (input.locationCount === 2) {
    breakdown.singleLocation = 2;
  }

  if (input.weakWebsite || input.websiteStale) {
    breakdown.weakWebsite = 10;
    opportunities.push("Website needs work — dated or weak conversion (cowpigchicken profile)");
  }
  if (input.websiteStale) {
    breakdown.staleWebsite = 5;
  }

  if (input.locationCount != null && input.locationCount > icp.locationMax) {
    disqualifiers.push("too_many_locations");
  }

  const total = Math.min(
    100,
    breakdown.reviews +
      breakdown.rating +
      breakdown.platformRank +
      breakdown.singleLocation +
      breakdown.weakWebsite +
      breakdown.staleWebsite,
  );

  return { total, breakdown, opportunities, disqualifiers };
}
