import { describe, expect, it } from "vitest";
import { buildEvidencePackV1 } from "@/lib/audit/evidence-pack";
import {
  applyRubricV2ToPayload,
  computeRubricV2,
  rubricFixtureEliteSignals,
  rubricFixtureWeakSignals,
} from "@/lib/audit/rubric-v2";
import { computeRestaurantScores } from "@/lib/audit/restaurant-scoring";
import {
  scoreBrandSocialFromEvidence,
  scoreIdentityFromEvidence,
  scoreWebsiteFromEvidence,
} from "@/lib/audit/evidence-score";
import type { AuditResultPayload } from "@/lib/audit/types";

/** Elias-shaped elite evidence — identity, visuals, menu, booking, mobile, brand+social. No hostname floor. */
function eliasElitePack() {
  return buildEvidencePackV1({
    restaurantName: "Fuga",
    city: "Paris",
    websiteUrl: "https://example-elite-restaurant.test",
    signals: rubricFixtureEliteSignals(),
    pageEvidence: {
      titleSnippet: "Fuga — Creative dining in Paris",
      metaDescriptionSnippet: "Book a table. Explore the menu. An immersive restaurant experience.",
      socialLinksFound: [
        { platform: "instagram", url: "https://instagram.com/fuga" },
        { platform: "tiktok", url: "https://tiktok.com/@fuga" },
        { platform: "facebook", url: "https://facebook.com/fuga" },
        { platform: "youtube", url: "https://youtube.com/fuga" },
      ],
      contentFingerprint: "elias-elite",
      imageCandidates: [
        { ref: "hero", url: "https://example.test/hero.jpg", source: "og:image" },
        { ref: "dish", url: "https://example.test/dish.jpg", source: "img" },
      ],
    },
    guestSignals: {
      hasOpeningHours: true,
      hasAddressOrDirections: true,
      hasMenuPath: true,
      reviewWidgetDetected: true,
      mapsPlaceIds: ["ChIJEliteCalibrationPlace0001"],
      aggregateRating: 4.7,
      aggregateReviewCount: 420,
    },
    engagementSignals: {
      estimatedDwellSeconds: { low: 40, high: 90 },
      dwellScore: 82,
      stayConnectedScore: 88,
      rationale: ["Rich menu and booking CTAs"],
      contentDepth: {
        visibleTextWords: 600,
        sectionCount: 8,
        hasMenuContent: true,
        hasStoryOrAbout: true,
        internalLinkCount: 24,
      },
      ctaAudit: {
        bookReserve: true,
        orderOnline: false,
        phone: true,
        emailCapture: true,
        whatsApp: false,
        giftCards: false,
        socialLinkCount: 4,
        heroCtaLabels: ["Book a table", "View menu"],
        conversionElementCount: 3,
      },
    },
    stagehandExtraction: {
      restaurant: {
        name: "Fuga",
        cuisine: "Contemporary",
        location: "Paris",
        vibe: "Immersive creative dining",
      },
      hero: {
        headline: "Dine inside the story",
        cta_buttons: ["Book a table", "View menu"],
        image_description: "Full-bleed dining room with warm lighting",
      },
      menu: {
        categories: ["Starters", "Mains", "Dessert", "Wine"],
        top_dishes: [{ name: "Seasonal tasting", description: "Chef's selection" }],
      },
      visuals: {
        food_images: [
          { description: "Plated mains", quality_assessment: "High", improvement_suggestions: "" },
          { description: "Interior", quality_assessment: "High", improvement_suggestions: "" },
          { description: "Dessert", quality_assessment: "High", improvement_suggestions: "" },
        ],
        videos: [],
      },
      seo: {
        meta_title: "Fuga Paris",
        meta_description: "Book Fuga",
        headings: ["Fuga", "Menu", "Reservations"],
        local_keywords: ["restaurant paris"],
      },
      conversion_elements: [
        { type: "reservation", location: "hero", text: "Book a table" },
        { type: "menu", location: "nav", text: "Menu" },
        { type: "phone", location: "footer", text: "Call" },
      ],
    },
  });
}

function weakPack() {
  return buildEvidencePackV1({
    restaurantName: "Weak Cafe",
    city: "Nowhere",
    websiteUrl: "https://weak-local.example",
    signals: rubricFixtureWeakSignals(),
    pageEvidence: {
      titleSnippet: "Home",
      metaDescriptionSnippet: null,
      socialLinksFound: [],
      contentFingerprint: null,
      imageCandidates: [],
    },
  });
}

function toPayload(pack: ReturnType<typeof eliasElitePack>, extras?: Partial<AuditResultPayload>): AuditResultPayload {
  const rubric = computeRubricV2({
    evidencePack: pack,
    pageSpeed: {
      fetchedAt: new Date().toISOString(),
      performanceScore: 72,
      lcpMs: 2600,
      cls: 0.06,
    },
    visualMetrics: {
      version: 1,
      computedAt: new Date().toISOString(),
      brisqueApprox: 20,
      sharpnessScore: 80,
      vibrancyScore: 78,
      contrastScore: 75,
      foodWarmthHeuristic: 82,
      overallHeuristic: 88,
      notes: "elite fixture",
    },
    stagehandExtraction: pack.stagehandExtraction,
  });

  const withDesign = {
    ...pack,
    designQualityAnalysis: {
      version: 1 as const,
      model: "test",
      scoredAt: new Date().toISOString(),
      designQualityScore: 91,
      tier: "premium" as const,
      amateurSignals: [],
      strengths: ["Clear identity", "Immersive visuals", "Frictionless booking"],
      summary: "Premium restaurant site matching Elias elite traits.",
      imageRefs: ["hero"],
    },
  };

  return applyRubricV2ToPayload(
    {
      id: "elias",
      restaurantName: pack.restaurantName,
      city: pack.city,
      websiteUrl: pack.websiteUrl,
      competitors: [],
      opportunities: [],
      scores: { overall: 0, seo: 0, design: 0, mobile: 0, conversion: 0 },
      evidencePack: withDesign,
      visualMetrics: {
        version: 1,
        computedAt: new Date().toISOString(),
        brisqueApprox: 20,
        sharpnessScore: 80,
        vibrancyScore: 78,
        contrastScore: 75,
        foodWarmthHeuristic: 82,
        overallHeuristic: 88,
        notes: "elite fixture",
      },
      stagehandExtraction: pack.stagehandExtraction,
      ...extras,
    } as AuditResultPayload,
    rubric,
  );
}

describe("Elias calibration (no hostname floors)", () => {
  it("scores elite identity/visuals/menu/booking/social evidence at 90+", () => {
    const pack = eliasElitePack();
    expect(scoreBrandSocialFromEvidence(pack)).toBeGreaterThanOrEqual(90);

    const payload = toPayload(pack);
    const gaps: string[] = [];
    expect(scoreIdentityFromEvidence(payload)).toBeGreaterThanOrEqual(88);
    expect(scoreWebsiteFromEvidence(payload, gaps)).toBeGreaterThanOrEqual(88);

    const restaurant = computeRestaurantScores(payload);
    expect(restaurant.overall).toBeGreaterThanOrEqual(90);
    expect(restaurant.grade).toBe("A");
    expect(restaurant.website).toBeGreaterThanOrEqual(88);
  });

  it("keeps weak sites at or below 55", () => {
    const pack = weakPack();
    const rubric = computeRubricV2({ evidencePack: pack });
    const payload = applyRubricV2ToPayload(
      {
        id: "weak",
        restaurantName: "Weak Cafe",
        city: "Nowhere",
        websiteUrl: "https://weak-local.example",
        competitors: [],
        opportunities: [],
        scores: { overall: 0, seo: 0, design: 0, mobile: 0, conversion: 0 },
        evidencePack: pack,
      } as AuditResultPayload,
      rubric,
    );
    const restaurant = computeRestaurantScores(payload);
    expect(restaurant.overall).toBeLessThanOrEqual(55);
  });

  it("lets elite website+brand reach A even with average Places reviews", () => {
    const pack = eliasElitePack();
    const payload = toPayload(pack);
    payload.evidencePack = {
      ...payload.evidencePack!,
      googlePlace: {
        placeId: "ChIJAverageListing",
        rating: 4.1,
        reviewCount: 90,
        photoCount: 18,
        reviews: [],
      },
    };
    const restaurant = computeRestaurantScores(payload);
    expect(restaurant.overall).toBeGreaterThanOrEqual(90);
    expect(restaurant.grade).toBe("A");
  });
});
