import { describe, expect, it } from "vitest";
import { extractMapsPlaceIdsFromHtml, extractOnPageGuestSignals } from "@/lib/audit/on-page-guest-signals";

describe("extractOnPageGuestSignals", () => {
  it("reads hours, menu, maps place id, and JSON-LD ratings", () => {
    const html = `
      <html><body>
        <p>Opening hours Monday–Sunday</p>
        <a href="/menu">View menu</a>
        <a href="https://www.google.com/maps/search/?api=1&query_place_id=ChIJN1t_tDeuEmsRUsoyG83frY4">Find us</a>
        <script type="application/ld+json">{"@type":"Restaurant","aggregateRating":{"ratingValue":4.6,"reviewCount":210}}</script>
      </body></html>
    `;
    const g = extractOnPageGuestSignals(html);
    expect(g.hasOpeningHours).toBe(true);
    expect(g.hasMenuPath).toBe(true);
    expect(g.mapsPlaceIds[0]).toContain("ChIJ");
    expect(g.aggregateRating).toBeCloseTo(4.6);
    expect(g.aggregateReviewCount).toBe(210);
    expect(extractMapsPlaceIdsFromHtml(html).length).toBeGreaterThan(0);
  });
});
