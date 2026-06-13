import { describe, expect, it } from "vitest";
import { computeKobOpportunityScore } from "@/lib/lead-engine/kob-opportunity-score";

describe("computeKobOpportunityScore", () => {
  it("scores dream lead highly", () => {
    const result = computeKobOpportunityScore({
      reviewCount: 1200,
      rating: 4.4,
      ratingBand: "ideal",
      instagramFollowers: 4800,
      instagramPostGapDays: 21,
      hasTikTok: false,
      weakWebsite: true,
      websiteStale: true,
      weakPhotography: true,
      hasEmailCapture: false,
      hasGoogleBusinessPosts: false,
      instagramFollowersKnown: true,
      locationCount: 1,
      platformRankPercentile: 0.12,
    });
    expect(result.total).toBeGreaterThanOrEqual(60);
    expect(result.opportunities.length).toBeGreaterThan(0);
    expect(result.disqualifiers).toHaveLength(0);
  });

  it("disqualifies instagram over 10k", () => {
    const result = computeKobOpportunityScore({
      reviewCount: 500,
      rating: 4.5,
      ratingBand: "ideal",
      instagramFollowers: 12_000,
      instagramPostGapDays: 2,
      hasTikTok: false,
      weakWebsite: false,
      websiteStale: false,
      weakPhotography: false,
      hasEmailCapture: true,
      hasGoogleBusinessPosts: true,
      instagramFollowersKnown: true,
      locationCount: 1,
      platformRankPercentile: 0.2,
    });
    expect(result.disqualifiers).toContain("instagram_too_large");
  });
});
