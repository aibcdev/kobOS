import { describe, expect, it } from "vitest";
import { scoreWebsiteIdentity } from "@/lib/audit/website-identity";

describe("scoreWebsiteIdentity", () => {
  it("rejects kingsway.com surface-care for Kingsway Karahi", () => {
    const html = `
      <title>Home - Kingsway, The Surface Care Experts™</title>
      <body>${"Kingsway surface care flooring sealant industrial cleaning products. ".repeat(50)}</body>
    `;
    const result = scoreWebsiteIdentity({
      restaurantName: "Kingsway Karahi",
      city: "Luton",
      url: "https://kingsway.com/",
      html,
    });
    expect(result.matched).toBe(false);
    expect(result.hasNegativeIndustryCue).toBe(true);
  });

  it("accepts a real restaurant page with name + hospitality cues", () => {
    const html = `
      <title>Best Indian Takeaway in Eastbourne | Curry Master</title>
      <body>${"Curry Master Indian Food Takeaway Eastbourne menu book a table opening hours. ".repeat(40)}</body>
    `;
    const result = scoreWebsiteIdentity({
      restaurantName: "Curry Master",
      city: "Eastbourne",
      url: "https://www.currymasterindian.co.uk/",
      html,
    });
    expect(result.matched).toBe(true);
    expect(result.hasHospitalityCue).toBe(true);
  });

  it("rejects partial first-token brand match without distinctive tokens", () => {
    const html = `
      <title>Kingsway Corporate Group</title>
      <body>${"Welcome to Kingsway corporate services consulting. ".repeat(40)}</body>
    `;
    const result = scoreWebsiteIdentity({
      restaurantName: "Kingsway Karahi",
      city: "Luton",
      url: "https://kingsway.com/",
      html,
    });
    expect(result.matched).toBe(false);
  });
});
