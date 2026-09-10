import { describe, expect, it } from "vitest";

import { buildEvidencePackV1, type AuditEvidencePackV1 } from "@/lib/audit/evidence-pack";
import { computeRestaurantScores } from "@/lib/audit/restaurant-scoring";
import { applyRubricV2ToPayload, computeRubricV2 } from "@/lib/audit/rubric-v2";
import type { UrlSignals } from "@/lib/audit/analyze-url";
import type { AuditResultPayload } from "@/lib/audit/types";

/**
 * Fairness contract: a clearly superior restaurant must never score below a clearly
 * weaker one, whatever optional enrichment happened to succeed on either scan.
 * Missing AI, missing PageSpeed and an incomplete render are gaps in our data, not
 * faults of the restaurant, so they must not reorder the two.
 */

function signals(over: Partial<UrlSignals>): UrlSignals {
  return {
    fetched: true,
    fetchError: false,
    status: 200,
    titleLen: 0,
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
    htmlSizeKb: 20,
    hasOgImage: false,
    hasTwitterCard: false,
    hasLangAttr: false,
    hasNoindex: false,
    robotsTxtFound: false,
    sitemapFound: false,
    mentionsRobotsOrSitemap: false,
    ...over,
  };
}

const STRONG_SIGNALS = signals({
  titleLen: 42,
  hasMetaDescription: true,
  metaDescriptionLen: 140,
  h1Count: 1,
  h2Count: 5,
  hasOgTitle: true,
  hasCanonical: true,
  hasJsonLd: true,
  hasRestaurantSchema: true,
  hasViewport: true,
  isHttps: true,
  hasTelLink: true,
  hasMailto: true,
  hasBookOrReserveKeyword: true,
  hasOrderOrDeliveryKeyword: true,
  hasOpenTableOrResy: true,
  imgCount: 24,
  imgWithAltCount: 22,
  htmlSizeKb: 220,
  hasOgImage: true,
  hasTwitterCard: true,
  hasLangAttr: true,
  robotsTxtFound: true,
  sitemapFound: true,
  mentionsRobotsOrSitemap: true,
});

const WEAK_SIGNALS = signals({ titleLen: 6, htmlSizeKb: 9 });

type Variant = {
  /** Gemini design pass succeeded. */
  ai?: boolean;
  /** PageSpeed Insights returned a score. */
  pageSpeed?: boolean;
  /** Browserbase render finished. */
  rendered?: boolean;
};

function buildPayload(kind: "strong" | "weak", variant: Variant): AuditResultPayload {
  const strong = kind === "strong";
  const pack: AuditEvidencePackV1 = buildEvidencePackV1({
    restaurantName: strong ? "Strong Kitchen" : "Weak Cafe",
    city: "Nottingham",
    websiteUrl: strong ? "https://strong.example" : "https://weak.example",
    signals: strong ? STRONG_SIGNALS : WEAK_SIGNALS,
    pageEvidence: {
      titleSnippet: strong ? "Strong Kitchen · Nottingham" : "Home",
      metaDescriptionSnippet: strong ? "Book a table at Strong Kitchen." : null,
      socialLinksFound: strong
        ? [
            { platform: "instagram", url: "https://instagram.com/strong" },
            { platform: "facebook", url: "https://facebook.com/strong" },
            { platform: "tiktok", url: "https://tiktok.com/@strong" },
          ]
        : [],
      contentFingerprint: strong ? "aaa" : null,
      imageCandidates: strong
        ? [{ ref: "hero", url: "https://strong.example/hero.jpg", source: "og:image" }]
        : [],
    },
    guestSignals: strong
      ? {
          hasOpeningHours: true,
          hasAddressOrDirections: true,
          hasMenuPath: true,
          reviewWidgetDetected: true,
          mapsPlaceIds: ["ChIJStrongPlaceId0000000000"],
          aggregateRating: 4.7,
          aggregateReviewCount: 900,
        }
      : {
          hasOpeningHours: false,
          hasAddressOrDirections: false,
          hasMenuPath: false,
          reviewWidgetDetected: false,
          mapsPlaceIds: [],
          aggregateRating: null,
          aggregateReviewCount: null,
        },
  });

  if (variant.pageSpeed) {
    pack.pageSpeed = {
      fetchedAt: new Date().toISOString(),
      performanceScore: strong ? 62 : 88,
      lcpMs: strong ? 3200 : 1400,
      cls: strong ? 0.12 : 0.01,
    } as AuditEvidencePackV1["pageSpeed"];
  }
  if (variant.ai) {
    pack.designQualityAnalysis = {
      designQualityScore: strong ? 92 : 34,
      tier: strong ? "premium" : "amateur",
    } as AuditEvidencePackV1["designQualityAnalysis"];
  }

  const base = {
    id: `${kind}-${JSON.stringify(variant)}`,
    restaurantName: pack.restaurantName,
    city: "Nottingham",
    websiteUrl: pack.websiteUrl,
    competitors: [],
    opportunities: [],
    scores: { overall: 0, seo: 0, design: 0, mobile: 0, conversion: 0 },
    evidencePack: pack,
    scanStatus: variant.rendered === false ? "pending" : "ready",
  } as unknown as AuditResultPayload;

  return applyRubricV2ToPayload(
    base,
    computeRubricV2({ evidencePack: pack, pageSpeed: pack.pageSpeed }),
  );
}

function overallFor(kind: "strong" | "weak", variant: Variant): number {
  return computeRestaurantScores(buildPayload(kind, variant)).overall;
}

const VARIANTS: { label: string; variant: Variant }[] = [
  { label: "all enrichment succeeded", variant: { ai: true, pageSpeed: true, rendered: true } },
  { label: "AI failed", variant: { ai: false, pageSpeed: true, rendered: true } },
  { label: "PageSpeed missing", variant: { ai: true, pageSpeed: false, rendered: true } },
  { label: "render incomplete", variant: { ai: true, pageSpeed: true, rendered: false } },
  { label: "no enrichment at all", variant: {} },
];

describe("audit score monotonicity", () => {
  for (const { label, variant } of VARIANTS) {
    it(`ranks the superior site above the weaker one when ${label}`, () => {
      expect(overallFor("strong", variant)).toBeGreaterThan(overallFor("weak", variant));
    });
  }

  it("keeps the superior site ahead across mismatched enrichment", () => {
    // Worst case for fairness: the strong site lost every optional signal while the
    // weak site got the full treatment.
    const strongUnlucky = overallFor("strong", {});
    const weakLucky = overallFor("weak", { ai: true, pageSpeed: true, rendered: true });
    expect(strongUnlucky).toBeGreaterThan(weakLucky);
  });

  it("does not penalise a site whose crawl errored", () => {
    const pack = buildEvidencePackV1({
      restaurantName: "Blocked Bistro",
      city: "Nottingham",
      websiteUrl: "https://blocked.example",
      signals: signals({ fetched: true, fetchError: true, status: 403 }),
      pageEvidence: {
        titleSnippet: null,
        metaDescriptionSnippet: null,
        socialLinksFound: [],
        contentFingerprint: null,
        imageCandidates: [],
      },
    });
    const payload = applyRubricV2ToPayload(
      {
        id: "blocked",
        restaurantName: "Blocked Bistro",
        city: "Nottingham",
        websiteUrl: "https://blocked.example",
        competitors: [],
        opportunities: [],
        scores: { overall: 0, seo: 0, design: 0, mobile: 0, conversion: 0 },
        evidencePack: pack,
        scanStatus: "ready",
      } as unknown as AuditResultPayload,
      computeRubricV2({ evidencePack: pack }),
    );

    const scores = computeRestaurantScores(payload);
    // Unreadable, so we say so rather than presenting a confident low grade.
    expect(scores.confidence).toBe("low");
    expect(scores.dataGaps?.join(" ")).toContain("could not be read");
  });
});
