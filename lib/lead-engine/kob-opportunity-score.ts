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
  instagram: number;
  tiktok: number;
  website: number;
  photography: number;
  emailCapture: number;
  googleBusinessPosts: number;
  platformRank: number;
  singleLocation: number;
  staleWebsite: number;
};

export type KobScoreResult = {
  total: number;
  breakdown: KobScoreBreakdown;
  opportunities: string[];
  disqualifiers: string[];
};

export function computeKobOpportunityScore(input: KobScoreInput): KobScoreResult {
  const icp = getLeadEngineConfig();
  const breakdown: KobScoreBreakdown = {
    reviews: 0,
    rating: 0,
    instagram: 0,
    tiktok: 0,
    website: 0,
    photography: 0,
    emailCapture: 0,
    googleBusinessPosts: 0,
    platformRank: 0,
    singleLocation: 0,
    staleWebsite: 0,
  };
  const opportunities: string[] = [];
  const disqualifiers: string[] = [];

  const reviews = input.reviewCount ?? 0;
  if (reviews >= 100 && reviews <= 2500) {
    breakdown.reviews = 20;
  } else if (reviews >= 50 && reviews < 100) {
    breakdown.reviews = 10;
    opportunities.push("Growing review base — good time to improve visibility before competitors");
  } else if (reviews > 2500 && reviews <= 5000) {
    breakdown.reviews = 5;
  }

  if (input.ratingBand === "ideal") {
    breakdown.rating = 15;
  } else if (input.rating != null && input.rating >= 4.0 && input.rating < 4.1) {
    breakdown.rating = 8;
  }

  const ig = input.instagramFollowers;
  if (input.instagramFollowersKnown && ig != null) {
    if (ig >= 1000 && ig < icp.instagramMax) {
      breakdown.instagram = 15;
      if ((input.instagramPostGapDays ?? 0) >= 14) {
        breakdown.instagram = Math.min(15, breakdown.instagram + 3);
        opportunities.push("Instagram posting is inconsistent — weeks between posts");
      }
    } else if (ig < 300) {
      opportunities.push("Small Instagram presence — room to build local audience");
      breakdown.instagram = 8;
    } else if (ig >= icp.instagramMax) {
      disqualifiers.push("instagram_too_large");
    } else if (ig >= 300 && ig < 1000) {
      breakdown.instagram = 10;
    }
  } else if (!input.instagramFollowersKnown) {
    breakdown.instagram = 8;
    opportunities.push("Instagram presence unclear — worth auditing social channels");
  }

  if (!input.hasTikTok) {
    breakdown.tiktok = 10;
    opportunities.push("No TikTok — missing a fast-growing discovery channel");
  }

  if (input.weakWebsite || input.websiteStale) {
    breakdown.website = 20;
    opportunities.push("Website needs work — slow, dated, or weak conversion");
  }

  if (input.websiteStale) {
    breakdown.staleWebsite = 5;
    opportunities.push("Website hasn't been updated in years — easy refresh win");
  }

  if (input.weakPhotography) {
    breakdown.photography = 10;
    opportunities.push("Food photography could be stronger — mixed or low-quality imagery");
  }

  if (!input.hasEmailCapture) {
    breakdown.emailCapture = 5;
    opportunities.push("No email capture — missing repeat visits and VIP list");
  }

  if (!input.hasGoogleBusinessPosts) {
    breakdown.googleBusinessPosts = 5;
    opportunities.push("No Google Business posts — easy local SEO win");
  }

  if (input.platformRankPercentile != null && input.platformRankPercentile <= 0.3) {
    breakdown.platformRank = 5;
    opportunities.push("Strong delivery platform rank — proven demand in the area");
  }

  if (input.locationCount === 1) {
    breakdown.singleLocation = 3;
  }

  if (input.locationCount != null && input.locationCount > icp.locationMax) {
    disqualifiers.push("too_many_locations");
  }
  if (input.rating != null && input.rating >= icp.ratingMax) {
    disqualifiers.push("rating_too_high");
  }
  if (input.instagramFollowersKnown && (input.instagramFollowers ?? 0) >= icp.instagramMax) {
    disqualifiers.push("instagram_too_large");
  }

  const total = Math.min(
    100,
    breakdown.reviews +
      breakdown.rating +
      breakdown.instagram +
      breakdown.tiktok +
      breakdown.website +
      breakdown.photography +
      breakdown.emailCapture +
      breakdown.googleBusinessPosts +
      breakdown.platformRank +
      breakdown.singleLocation +
      breakdown.staleWebsite,
  );

  return { total, breakdown, opportunities, disqualifiers };
}
