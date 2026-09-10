import { describe, expect, it } from "vitest";
import { catalogItem, includedWithPlan, monthlyCreditGrant, monthlyIncludedLimit } from "./catalog";

describe("social content economics", () => {
  it("keeps paid-plan credit grants below monthly plan revenue", () => {
    expect(monthlyCreditGrant("STARTER")).toBe(20);
    expect(monthlyCreditGrant("PRO")).toBe(40);
  });

  it("prices expensive manual work higher", () => {
    expect(catalogItem("SOCIAL_TEXT")?.creditCost).toBe(3);
    expect(catalogItem("SOCIAL_IMAGES")?.creditCost).toBe(10);
    expect(catalogItem("SOCIAL_VIDEO")?.creditCost).toBe(20);
  });

  it("makes Pro social work credit-free but never unlimited", () => {
    for (const type of ["SOCIAL_TEXT", "SOCIAL_IMAGES", "SOCIAL_VIDEO"] as const) {
      expect(includedWithPlan(type, "PRO")).toBe(true);
      expect(monthlyIncludedLimit(type, "PRO")).toBeGreaterThan(0);
      expect(monthlyIncludedLimit(type, "STARTER")).toBeNull();
    }
  });
});
