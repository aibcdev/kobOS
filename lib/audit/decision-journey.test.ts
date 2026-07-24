import { describe, expect, it } from "vitest";
import {
  buildDecisionJourneyReport,
  journeyStatusFromScore,
  scoreDesireStage,
} from "@/lib/audit/decision-journey";
import type { AuditResultPayload } from "@/lib/audit/types";

function basePayload(overrides?: Partial<AuditResultPayload>): AuditResultPayload {
  return {
    gated: {
      roadmap: { days30: ["a"], days60: ["b"], days90: ["c"] },
      competitorDeepDive: [],
      keywordOpportunities: [],
      redesignPreviewNotes: "",
    },
    issues: [],
    scores: { seo: 70, design: 80, mobile: 75, overall: 55, conversion: 73 },
    teaser: { subline: "", headline: "", paletteNote: "" },
    scanStatus: "ready",
    competitors: [],
    opportunities: [],
    scoresPending: false,
    restaurantScores: {
      overall: 55,
      grade: "D",
      reviews: 42,
      gbp: 61,
      website: 73,
      competitors: 48,
      technical: 84,
      confidence: "medium",
      dataGaps: ["Few Google listing photos"],
    },
    opportunityReport: {
      version: "opportunity-v2",
      place_id: null,
      name: "Kingsway Karahi",
      status: "park",
      disqualifiers: [],
      opportunity_score: {
        revenue_potential: 3,
        marketing_maturity: 50,
        likelihood_to_buy: 70,
        est_monthly_lost_customers: 65,
        est_lost_revenue: 2000,
        currency: "GBP",
      },
      fit_proxy: 50,
      reasons: [],
      personalization_hooks: [],
      recommended_email_angle: null,
      locationLabel: "1 location",
      displayCity: "Luton",
      topFixes: [
        { title: "Respond to Google reviews", detail: "Reply", customersPerMonth: 29 },
        { title: "Update Google photos + posts", detail: "Photos", customersPerMonth: 23 },
        { title: "Help Google understand your restaurant", detail: "Schema", customersPerMonth: 17 },
      ],
      growthScore: 55,
      peerPercentileBottom: 45,
      projectedGrowthScore: 72,
      nearbyComparison: [],
    },
    evidencePack: {
      version: 1,
      collectedAt: new Date().toISOString(),
      restaurantName: "Kingsway Karahi",
      city: "Luton",
      websiteUrl: "https://example.com",
      userSocial: {},
      urlSignals: { fetched: true } as AuditResultPayload["evidencePack"] extends infer E
        ? E extends { urlSignals: infer U }
          ? U
          : never
        : never,
      pageEvidence: {
        titleSnippet: null,
        metaDescriptionSnippet: null,
        socialLinksFound: [],
        contentFingerprint: null,
      },
      googlePlace: {
        placeId: "x",
        rating: 4.1,
        reviewCount: 200,
        photoCount: 12,
        reviews: [],
      },
    } as AuditResultPayload["evidencePack"],
    ...overrides,
  } as AuditResultPayload;
}

describe("journeyStatusFromScore", () => {
  it("maps thresholds", () => {
    expect(journeyStatusFromScore(80)).toBe("Strong");
    expect(journeyStatusFromScore(65)).toBe("Acceptable");
    expect(journeyStatusFromScore(50)).toBe("Leaking");
    expect(journeyStatusFromScore(40)).toBe("Broken");
  });
});

describe("scoreDesireStage", () => {
  it("uses photo count when present", () => {
    const p = basePayload();
    expect(scoreDesireStage(p, p.restaurantScores)).toBe(48);
  });
});

describe("buildDecisionJourneyReport", () => {
  it("builds story-first journey with drop-offs and evidence ranges", () => {
    const report = buildDecisionJourneyReport(basePayload(), {
      restaurantName: "Kingsway Karahi",
      city: "Luton",
      websiteUrl: "https://example.com",
    });
    expect(report.version).toBe("decision-journey-v1");
    expect(report.opening).toContain("Luton");
    expect(report.stages).toHaveLength(5);
    expect(report.stages[4].id).toBe("outcome");
    expect(report.stages[4].score).toBeNull();
    expect(report.dropOffs).toHaveLength(3);
    expect(report.dropOffs[0].score).toBeLessThanOrEqual(report.dropOffs[2].score);
    expect(report.evidence.customersHigh).toBeGreaterThan(report.evidence.customersLow);
    expect(report.evidence.revenueHighGbp).toBeGreaterThan(report.evidence.revenueLowGbp);
    expect(report.stageDetails).toHaveLength(4);
    expect(report.repairPlan).toHaveLength(4);
    expect(report.repairPlan[0].stageLabel).toBe("Trust");
    expect(report.closer.startStageLabel).toBeTruthy();
    expect(report.competitorFactors.length).toBeGreaterThan(0);
  });
});
