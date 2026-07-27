import { describe, expect, it } from "vitest";
import {
  matchInstagramFromWebsite,
  normalizeInstagramUrl,
  scoreInstagramHit,
} from "@/lib/lead-engine/discover-instagram";

describe("discover-instagram", () => {
  it("rejects platform handles", () => {
    expect(normalizeInstagramUrl("https://instagram.com/squarespace")).toBeNull();
    expect(normalizeInstagramUrl("https://instagram.com/explore/tags/food")).toBeNull();
  });

  it("accepts on-site handle that matches the restaurant name", () => {
    const html = `<a href="https://www.instagram.com/dallowayterrace/">IG</a>`;
    const result = matchInstagramFromWebsite({
      name: "Dalloway Terrace",
      city: "London",
      websiteUrl: "https://dallowayterrace.com",
      websiteHtml: html,
    });
    expect(result.matched).toBe(true);
    expect(result.handle).toBe("dallowayterrace");
  });

  it("rejects on-site handle that only shares a place token", () => {
    const html = `<a href="https://www.instagram.com/bletchleynetworks/">IG</a>`;
    const result = matchInstagramFromWebsite({
      name: "Bletchley Bakery & Café",
      city: "Milton Keynes",
      websiteUrl: "https://bletchley.co.uk",
      websiteHtml: html,
    });
    expect(result.matched).toBe(false);
  });

  it("scores SERP title/bio matches highly", () => {
    const scored = scoreInstagramHit({
      name: "Vincenzo Trattoria",
      city: "Manchester",
      websiteUrl: "https://vincenzotrattoria.co.uk",
      hit: {
        url: "https://www.instagram.com/vincenzomanchester/",
        handle: "vincenzomanchester",
        title: "Vincenzo Trattoria (@vincenzomanchester) - Instagram",
        snippet:
          'Vincenzo Trattoria (@vincenzomanchester) on Instagram: "Traditional family run Italian Homemade pasta Manchester"',
      },
    });
    expect(scored.score).toBeGreaterThanOrEqual(55);
  });
});
