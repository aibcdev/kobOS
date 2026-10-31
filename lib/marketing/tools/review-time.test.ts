import { describe, expect, it } from "vitest";
import { cleanInputs, inputsFromQuery, monthlyAdminHours, REVIEW_TIME_EXAMPLE } from "./review-time";

describe("monthlyAdminHours", () => {
  it("normal inputs: (20 × 5 + 4.33 × 30 × 1) / 60", () => {
    expect(monthlyAdminHours(REVIEW_TIME_EXAMPLE)).toBe(3.8);
    expect(monthlyAdminHours({ reviews: 60, minutesPerReply: 6, locations: 3, weeklyListingMinutes: 45 })).toBe(15.8);
  });

  it("all zeros is zero", () => {
    expect(monthlyAdminHours({ reviews: 0, minutesPerReply: 0, locations: 0, weeklyListingMinutes: 0 })).toBe(0);
  });

  it("negatives clamp to 0", () => {
    expect(cleanInputs({ reviews: -5, minutesPerReply: -1, locations: -2, weeklyListingMinutes: -30 })).toEqual({
      reviews: 0,
      minutesPerReply: 0,
      locations: 0,
      weeklyListingMinutes: 0,
    });
  });

  it("non-numeric input counts as 0", () => {
    expect(monthlyAdminHours({ reviews: "lots", minutesPerReply: 5, locations: 1, weeklyListingMinutes: NaN })).toBe(0);
    expect(cleanInputs({ reviews: undefined, minutesPerReply: null, locations: {}, weeklyListingMinutes: Infinity }).reviews).toBe(0);
  });

  it("very large input is capped (10,000 reviews)", () => {
    expect(cleanInputs({ reviews: 1e9 }).reviews).toBe(10_000);
    expect(monthlyAdminHours({ reviews: 1e9, minutesPerReply: 1, locations: 0, weeklyListingMinutes: 0 })).toBe(166.7);
  });

  it("decimal minutes and string numbers", () => {
    expect(monthlyAdminHours({ reviews: "30", minutesPerReply: "2.5", locations: "1", weeklyListingMinutes: "0" })).toBe(1.3);
    expect(cleanInputs({ locations: 2.6 }).locations).toBe(3);
  });
});

describe("inputsFromQuery", () => {
  it("prefills from ?reviews=&minutes=&locations=&listing= and keeps the example for the rest", () => {
    expect(inputsFromQuery({ reviews: "45", minutes: "4" })).toEqual({ ...REVIEW_TIME_EXAMPLE, reviews: 45, minutesPerReply: 4 });
    expect(inputsFromQuery({ reviews: ["12", "99"], listing: "-3" })).toEqual({ ...REVIEW_TIME_EXAMPLE, reviews: 12, weeklyListingMinutes: 0 });
    expect(inputsFromQuery({})).toEqual(REVIEW_TIME_EXAMPLE);
  });
});
