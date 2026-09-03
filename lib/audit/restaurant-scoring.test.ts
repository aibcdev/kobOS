import { describe, expect, it } from "vitest";
import { buildEvidencePackV1 } from "@/lib/audit/evidence-pack";
import { applyRubricV2ToPayload, computeRubricV2, rubricFixtureEliteSignals } from "@/lib/audit/rubric-v2";
import { computeRestaurantScores } from "@/lib/audit/restaurant-scoring";
import { scoreBrandSocialFromEvidence } from "@/lib/audit/evidence-score";
import type { AuditResultPayload } from "@/lib/audit/types";

function eliteKfcPack() {
  return buildEvidencePackV1({
    restaurantName: "KFC",
    city: "Louisville",
    websiteUrl: "https://www.kfc.com",
    signals: rubricFixtureEliteSignals(),
    pageEvidence: {
      titleSnippet: "KFC",
      metaDescriptionSnippet: "Order KFC online for delivery and pickup.",
      socialLinksFound: [
        { platform: "instagram", url: "https://instagram.com/kfc" },
        { platform: "facebook", url: "https://facebook.com/kfc" },
        { platform: "tiktok", url: "https://tiktok.com/@kfc" },
        { platform: "youtube", url: "https://youtube.com/kfc" },
      ],
      contentFingerprint: "abc",
      imageCandidates: [{ ref: "hero", url: "https://kfc.com/hero.jpg", source: "og:image" }],
    },
  });
}

describe("evidence-based restaurant scoring", () => {
  it("scores strong site + social evidence at 90+ without host allowlists", () => {
    const evidencePack = eliteKfcPack();
    expect(scoreBrandSocialFromEvidence(evidencePack)).toBeGreaterThanOrEqual(90);

    const rubric = computeRubricV2({
      evidencePack,
      pageSpeed: {
        fetchedAt: new Date().toISOString(),
        performanceScore: 78,
        lcpMs: 2200,
        cls: 0.05,
      },
      visualMetrics: { overallHeuristic: 85, fetchedAt: new Date().toISOString() } as never,
    });

    expect(rubric.overall).toBeGreaterThanOrEqual(90);
    expect(rubric.brandSocialPresence).toBeGreaterThanOrEqual(88);

    const payload = applyRubricV2ToPayload(
      {
        id: "test",
        restaurantName: "KFC",
        city: "Louisville",
        websiteUrl: "https://www.kfc.com",
        competitors: [],
        opportunities: [],
        scores: { overall: 0, seo: 0, design: 0, mobile: 0, conversion: 0 },
        evidencePack,
      } as AuditResultPayload,
      rubric,
    );

    const restaurant = computeRestaurantScores(payload);
    expect(restaurant.overall).toBeGreaterThanOrEqual(90);
    expect(restaurant.website).toBeGreaterThanOrEqual(85);
    expect(restaurant.reviews).toBeNull();
    expect(restaurant.gbp).toBeNull();
    expect(restaurant.grade).toBe("A");
  });

  it("does not inflate weak sites without evidence", () => {
    const weakPack = buildEvidencePackV1({
      restaurantName: "Weak Cafe",
      city: "Nowhere",
      websiteUrl: "https://weak-local.example",
      signals: {
        fetched: true,
        status: 200,
        titleLen: 8,
        hasMetaDescription: false,
        metaDescriptionLen: 0,
        h1Count: 0,
        h2Count: 0,
        hasOgTitle: false,
        hasCanonical: false,
        hasJsonLd: false,
        hasRestaurantSchema: false,
        hasViewport: false,
        isHttps: false,
        hasTelLink: false,
        hasMailto: false,
        hasBookOrReserveKeyword: false,
        hasOrderOrDeliveryKeyword: false,
        hasOpenTableOrResy: false,
        imgCount: 0,
        imgWithAltCount: 0,
        htmlSizeKb: 12,
        hasOgImage: false,
        hasTwitterCard: false,
        hasLangAttr: false,
        hasNoindex: false,
        robotsTxtFound: false,
        sitemapFound: false,
        mentionsRobotsOrSitemap: false,
      },
      pageEvidence: {
        titleSnippet: "Home",
        metaDescriptionSnippet: null,
        socialLinksFound: [],
        contentFingerprint: null,
        imageCandidates: [],
      },
    });

    const payload = applyRubricV2ToPayload(
      {
        id: "weak",
        restaurantName: "Weak Cafe",
        city: "Nowhere",
        websiteUrl: "https://weak-local.example",
        competitors: [],
        opportunities: [],
        scores: { overall: 0, seo: 0, design: 0, mobile: 0, conversion: 0 },
        evidencePack: weakPack,
      } as AuditResultPayload,
      computeRubricV2({ evidencePack: weakPack }),
    );

    const restaurant = computeRestaurantScores(payload);
    expect(restaurant.overall).toBeLessThanOrEqual(55);
  });
});
