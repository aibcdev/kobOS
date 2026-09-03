import { describe, expect, it } from "vitest";
import { buildEvidencePackV1 } from "@/lib/audit/evidence-pack";
import { computeRubricV2, rubricFixtureEliteSignals, rubricFixtureWeakSignals } from "@/lib/audit/rubric-v2";

function pack(signals: ReturnType<typeof rubricFixtureEliteSignals>, url: string) {
  return buildEvidencePackV1({
    restaurantName: "Test",
    city: "Test City",
    websiteUrl: url,
    signals,
    pageEvidence: {
      titleSnippet: "Title",
      metaDescriptionSnippet: "Desc",
      socialLinksFound: [
        { platform: "instagram", url: "https://instagram.com/test" },
        { platform: "tiktok", url: "https://tiktok.com/@test" },
        { platform: "facebook", url: "https://facebook.com/test" },
      ],
      contentFingerprint: "abc",
      imageCandidates: [],
    },
    guestSignals: {
      hasOpeningHours: true,
      hasAddressOrDirections: true,
      hasMenuPath: true,
      reviewWidgetDetected: false,
      mapsPlaceIds: [],
      aggregateRating: null,
      aggregateReviewCount: null,
    },
  });
}

describe("computeRubricV2", () => {
  it("scores elite evidence at least 90 overall from measurable checks", () => {
    const evidencePack = pack(rubricFixtureEliteSignals(), "https://www.kfc.com");
    const rubric = computeRubricV2({
      evidencePack,
      pageSpeed: { fetchedAt: new Date().toISOString(), performanceScore: 78, lcpMs: 2200, cls: 0.05 },
    });
    expect(rubric.overall).toBeGreaterThanOrEqual(90);
    expect(rubric.seo).toBeGreaterThanOrEqual(90);
  });

  it("scores weak sites below 55 overall", () => {
    const evidencePack = pack(rubricFixtureWeakSignals(), "https://weak-local.example");
    const rubric = computeRubricV2({ evidencePack });
    expect(rubric.overall).toBeLessThanOrEqual(55);
  });
});
