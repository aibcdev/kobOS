import { describe, expect, it } from "vitest";
import { classifyRestaurant } from "@/lib/lead-engine/restaurant-classifier";

describe("classifyRestaurant", () => {
  it("accepts a normal Indian restaurant", () => {
    const r = classifyRestaurant({
      name: "Light Of Bengal",
      categories: ["indian restaurant", "restaurant"],
      websiteText: "Book a table · Opening hours · Visit us in Liverpool",
      hasDineIn: true,
    });
    expect(r.is_restaurant).toBe(true);
    expect(r.confidence).toBe("high");
  });

  it("hard-rejects caterer category", () => {
    const r = classifyRestaurant({
      name: "Refill Events",
      categories: ["caterer", "food service"],
      websiteText: "Corporate packages and wedding menus",
    });
    expect(r.is_restaurant).toBe(false);
    expect(r.flags).toContain("hard_reject_category");
  });

  it("hard-rejects wedding catering keywords", () => {
    const r = classifyRestaurant({
      name: "Green Plate Co",
      categories: ["restaurant"],
      websiteText: "We specialise in wedding catering and event packages. Get a quote for your event.",
    });
    expect(r.is_restaurant).toBe(false);
    expect(r.flags).toContain("hard_reject_keyword");
  });

  it("hard-rejects event catering in the name", () => {
    const r = classifyRestaurant({
      name: "City Event Catering Ltd",
      categories: ["restaurant"],
    });
    expect(r.is_restaurant).toBe(false);
    expect(r.flags).toContain("hard_reject_name");
  });

  it("allows hybrid takeaway+catering when dine-in signals are strong", () => {
    const r = classifyRestaurant({
      name: "Refill",
      categories: ["restaurant", "takeaway"],
      websiteText:
        "Book a table tonight. Visit us on High Street. We also offer corporate catering for larger groups.",
      hasDineIn: true,
    });
    expect(r.is_restaurant).toBe(true);
    expect(r.flags).toContain("hybrid_accepted");
  });

  it("rejects borderline takeaway with no dine-in language", () => {
    const r = classifyRestaurant({
      name: "Quick Bites Express",
      categories: ["meal_takeaway", "takeaway"],
      websiteText: "Order online for delivery. Menu updates weekly.",
      hasDineIn: false,
    });
    expect(r.is_restaurant).toBe(false);
    expect(r.flags).toContain("borderline_rejected");
  });

  it("rejects when reviews are only about events", () => {
    const r = classifyRestaurant({
      name: "Plate & Co",
      categories: ["restaurant"],
      websiteText: "Book a table",
      hasDineIn: true,
      reviewTexts: [
        "They catered for our wedding perfectly",
        "Delivered for our office lunch — great",
        "Corporate event catering was excellent",
        "Used them for our party",
      ],
    });
    expect(r.is_restaurant).toBe(false);
    expect(r.flags).toContain("event_review_theme");
  });
});
