import { describe, expect, it } from "vitest";
import { buildOwnerHeroFallback } from "@/lib/audit/build-owner-hero";
import { mergePerceptionAuditIntoPayload } from "@/lib/audit/gemini-perception-audit";
import {
  buildPeerBenchmarkContext,
  isForbiddenBenchmarkAnchor,
  sanitizeBenchmarkAnchors,
} from "@/lib/audit/peer-benchmark-config";
import type { AuditResultPayload, PerceptionAuditV1 } from "@/lib/audit/types";

function minimalPayload(overrides: Partial<AuditResultPayload> = {}): AuditResultPayload {
  return {
    scores: { overall: 38, seo: 70, design: 40, mobile: 50, conversion: 45 },
    issues: [],
    opportunities: [],
    competitors: [
      { name: "Local Grill Co", note: "Strong", mockScore: 72, source: "places" },
      { name: "Northampton Kitchen", note: "Good", mockScore: 68, source: "places" },
    ],
    teaser: { headline: "", subline: "", paletteNote: "" },
    gated: {
      keywordOpportunities: [],
      roadmap: {
        days30: ["Fix homepage hero and booking CTA"],
        days60: ["Improve food photography"],
        days90: ["Close peer gap on brand"],
      },
      competitorDeepDive: [],
      redesignPreviewNotes: "",
    },
    evidencePack: {
      version: 2,
      collectedAt: new Date().toISOString(),
      restaurantName: "The Smoke Pit",
      city: "Northampton",
      websiteUrl: "https://cowpigchicken.co.uk",
      userSocial: {},
      urlSignals: {
        hasHttps: true,
        hasViewport: true,
        titleLen: 20,
        metaDescLen: 80,
        imgCount: 5,
        hasTelLink: true,
        hasJsonLd: false,
        hasCanonical: false,
        wordCountEstimate: 400,
      },
      pageEvidence: {
        titleSnippet: null,
        metaDescriptionSnippet: null,
        socialLinksFound: [],
        contentFingerprint: null,
      },
    },
    ...overrides,
  } as AuditResultPayload;
}

function minimalPerception(overrides: Partial<PerceptionAuditV1> = {}): PerceptionAuditV1 {
  return {
    version: 1,
    model: "test",
    scoredAt: new Date().toISOString(),
    digitalPositioningScore: 38,
    confidence: "medium",
    positioningTable: [],
    perceptionGap: [],
    customerExperience: "Test",
    modernStandard: "Test",
    reviewIntelligence: { praiseThemes: [], complaintThemes: [], disconnect: "Test" },
    socialAnalysis: "Test",
    commercialSeo: "Test",
    revenueLeaks: [
      { title: "Mobile booking friction", impact: "high", narrative: "Guests bounce before booking." },
    ],
    benchmarkAnchors: ["McDonald's", "Local Grill Co"],
    overallSummary: "Test summary",
    ...overrides,
  } as PerceptionAuditV1;
}

describe("peer-benchmark-config", () => {
  it("flags mega-chain anchors as forbidden", () => {
    expect(isForbiddenBenchmarkAnchor("McDonald's")).toBe(true);
    expect(isForbiddenBenchmarkAnchor("Burger King")).toBe(true);
    expect(isForbiddenBenchmarkAnchor("Local Grill Co")).toBe(false);
  });

  it("sanitizes forbidden anchors and keeps peers", () => {
    const out = sanitizeBenchmarkAnchors(["McDonald's", "Dishoom"], ["Local Grill Co", "Honest Burgers"]);
    expect(out.some((a) => /mcdonald/i.test(a))).toBe(false);
    expect(out.some((a) => /dishoom/i.test(a))).toBe(false);
    expect(out.length).toBeGreaterThanOrEqual(2);
  });

  it("prefers nearby Places competitors in context", () => {
    const ctx = buildPeerBenchmarkContext(minimalPayload());
    expect(ctx.nearbyPeerNames).toContain("Local Grill Co");
    expect(ctx.suggestedAnchors.every((a) => !isForbiddenBenchmarkAnchor(a))).toBe(true);
  });
});

describe("mergePerceptionAuditIntoPayload", () => {
  it("sanitizes anchors and adds ownerHero", () => {
    const payload = minimalPayload();
    const perception = minimalPerception({ digitalPositioningScore: 38 });
    const merged = mergePerceptionAuditIntoPayload(payload, perception);
    expect(merged.perceptionAuditV1?.ownerHero).toBeDefined();
    expect(merged.perceptionAuditV1?.benchmarkAnchors.some((a) => /mcdonald/i.test(a))).toBe(false);
    expect(merged.scores.overall).toBe(38);
  });
});

describe("build-owner-hero", () => {
  it("builds leak percent and timeline for weak sites", () => {
    const hero = buildOwnerHeroFallback(minimalPayload(), minimalPerception());
    expect(hero.bookingLeakPercentLow).toBeGreaterThanOrEqual(5);
    expect(hero.bookingLeakPercentHigh).toBeGreaterThan(hero.bookingLeakPercentLow);
    expect(hero.timelinePhases).toHaveLength(3);
    expect(hero.customerLossBullets.length).toBeGreaterThanOrEqual(2);
  });
});
