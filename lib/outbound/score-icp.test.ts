import { describe, expect, it } from "vitest";

import { scoreIcp, type IcpRestaurantInput } from "@/lib/outbound/score-icp";

const harborHouse: IcpRestaurantInput = {
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
};

const mcdonalds: IcpRestaurantInput = {
  place_id: "ChIJ_mcd",
  name: "McDonald's Downtown",
  locations: 40,
  is_independent: false,
  is_chain: true,
  rating: 3.9,
  review_count: 2000,
  has_website: true,
  has_google_profile: true,
};

/** Good restaurant, fewer pain signals → park band. */
const bellaNapoli: IcpRestaurantInput = {
  place_id: "ChIJ_bella",
  name: "Bella Napoli",
  locations: 1,
  is_independent: true,
  is_chain: false,
  rating: 4.7,
  review_count: 120,
  days_since_last_instagram: 3,
  website_age_years: 2,
  has_dated_ux: false,
  has_recent_google_posts: true,
  review_response_rate: 0.8,
  has_website: true,
  has_google_profile: true,
  active_on_deliveroo_or_uber: false,
  is_competitive_city: true,
};

describe("scoreIcp (icp-fit-v1)", () => {
  it("qualifies Harbor House as perfect ICP (~155)", () => {
    const r = scoreIcp(harborHouse);
    expect(r.status).toBe("qualified");
    expect(r.fit_score).toBe(155);
    expect(r.matched_factors).toEqual(
      expect.arrayContaining([
        "1-5 locations",
        "independent",
        "rating under 4.5",
        "inactive Instagram",
        "dated website",
      ]),
    );
    expect(r.personalization_hooks.length).toBeGreaterThanOrEqual(2);
    expect(r.recommended_email_angle).toBeTruthy();
  });

  it("discards McDonald's for too many locations", () => {
    const r = scoreIcp(mcdonalds);
    expect(r.status).toBe("discard");
    expect(r.fit_score).toBe(0);
    expect(r.disqualifiers.some((d) => d.includes("too_many_locations"))).toBe(true);
  });

  it("parks Bella Napoli when score is mid-band", () => {
    const r = scoreIcp(bellaNapoli);
    // 1-5 loc +30, independent +20, competitive city +10 = 60
    expect(r.fit_score).toBe(60);
    expect(r.status).toBe("park");
  });

  it("hard-discards ghost kitchens", () => {
    const r = scoreIcp({ ...harborHouse, is_ghost_kitchen: true });
    expect(r.status).toBe("discard");
    expect(r.fit_score).toBe(0);
  });

  it("hard-discards rating below 3.2", () => {
    const r = scoreIcp({ ...harborHouse, rating: 3.0 });
    expect(r.status).toBe("discard");
  });
});
