import { describe, expect, it } from "vitest";
import { computeKobOpportunityScore } from "@/lib/lead-engine/kob-opportunity-score";

describe("computeKobOpportunityScore", () => {
  it("scores cowpigchicken-style lead highly", () => {
    const result = computeKobOpportunityScore({
      reviewCount: 180,
      rating: 4.1,
      ratingBand: "ideal",
      instagramFollowers: null,
      instagramPostGapDays: null,
      hasTikTok: false,
      weakWebsite: true,
      websiteStale: true,
      weakPhotography: false,
      hasEmailCapture: false,
      hasGoogleBusinessPosts: false,
      instagramFollowersKnown: false,
      locationCount: 1,
      platformRankPercentile: 0.08,
    });
    expect(result.total).toBeGreaterThanOrEqual(55);
    expect(result.opportunities.length).toBeGreaterThan(0);
    expect(result.disqualifiers).toHaveLength(0);
  });

  it("prioritises lower Google rating over high rating", () => {
    const low = computeKobOpportunityScore({
      reviewCount: 120,
      rating: 3.9,
      ratingBand: "ideal",
      instagramFollowers: null,
      instagramPostGapDays: null,
      hasTikTok: false,
      weakWebsite: false,
      websiteStale: false,
      weakPhotography: false,
      hasEmailCapture: false,
      hasGoogleBusinessPosts: false,
      instagramFollowersKnown: false,
      locationCount: 1,
      platformRankPercentile: 0.12,
    });
    const high = computeKobOpportunityScore({
      reviewCount: 120,
      rating: 4.8,
      ratingBand: "low",
      instagramFollowers: null,
      instagramPostGapDays: null,
      hasTikTok: false,
      weakWebsite: false,
      websiteStale: false,
      weakPhotography: false,
      hasEmailCapture: false,
      hasGoogleBusinessPosts: false,
      instagramFollowersKnown: false,
      locationCount: 1,
      platformRankPercentile: 0.12,
    });
    expect(low.total).toBeGreaterThan(high.total);
  });
});
