import { describe, expect, it } from "vitest";

import {
  calculateOpportunityScore,
  type OpportunityRestaurantInput,
} from "@/lib/outbound/score-opportunity";

const harborHouse: OpportunityRestaurantInput = {
  place_id: "ChIJ_harbor",
  name: "Harbor House",
  locations: 1,
  is_independent: true,
  is_chain: false,
  is_hotel: false,
  rating: 4.2,
  review_count: 487,
  days_since_last_instagram: 37,
  website_age_years: 7,
  has_dated_ux: true,
  has_recent_google_posts: false,
  review_response_rate: 0.18,
  is_ghost_kitchen: false,
  has_website: true,
  has_google_profile: true,
  active_on_deliveroo_or_uber: true,
  is_competitive_city: true,
  on_major_platform: false,
  avg_ticket: 32,
  currency: "GBP",
};

describe("calculateOpportunityScore (opportunity-v1)", () => {
  it("scores Harbor House as qualified with lost-revenue angle", () => {
    const r = calculateOpportunityScore(harborHouse);
    expect(r.status).toBe("qualified");
    expect(r.opportunity_score).not.toBeNull();
    expect(r.fit_proxy).toBeGreaterThanOrEqual(70);
    expect(r.opportunity_score!.likelihood_to_buy).toBeGreaterThanOrEqual(60);
    expect(r.opportunity_score!.est_monthly_lost_customers).toBeGreaterThan(0);
    expect(r.opportunity_score!.est_lost_revenue).toBeGreaterThan(0);
    expect(r.opportunity_score!.revenue_potential).toBeGreaterThanOrEqual(1);
    expect(r.opportunity_score!.revenue_potential).toBeLessThanOrEqual(5);
    expect(r.personalization_hooks.length).toBeGreaterThan(0);
    expect(r.recommended_email_angle).toBeTruthy();
  });

  it("discards hotel restaurants", () => {
    const r = calculateOpportunityScore({ ...harborHouse, is_hotel: true });
    expect(r.status).toBe("discard");
    expect(r.disqualifiers).toContain("hotel_restaurant");
    expect(r.opportunity_score).toBeNull();
  });

  it("discards too many locations", () => {
    const r = calculateOpportunityScore({
      ...harborHouse,
      locations: 12,
      is_chain: true,
    });
    expect(r.status).toBe("discard");
    expect(r.disqualifiers).toContain("too_many_locations");
  });

  it("parks strong venues with low pain", () => {
    const r = calculateOpportunityScore({
      name: "Bella Napoli",
      locations: 1,
      is_independent: true,
      rating: 4.7,
      review_count: 120,
      days_since_last_instagram: 3,
      website_age_years: 2,
      has_dated_ux: false,
      has_recent_google_posts: true,
      review_response_rate: 0.8,
      has_website: true,
      has_google_profile: true,
      is_competitive_city: true,
    });
    // fit_proxy = 30 + 20 = 50 → park
    expect(r.fit_proxy).toBe(50);
    expect(r.status).toBe("park");
  });
});
