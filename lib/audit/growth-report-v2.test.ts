import { describe, expect, it } from "vitest";
import {
  buildGrowthReportV2,
  customerRangeFromPoint,
  growthPotentialFromScore,
  revenueRangeFromCustomers,
} from "@/lib/audit/growth-report-v2";
import type { AuditResultPayload } from "@/lib/audit/types";

function basePayload(over: Partial<AuditResultPayload> = {}): AuditResultPayload {
  return {
    scores: { overall: 55, seo: 50, design: 50, mobile: 50, conversion: 45 },
    issues: [
      { title: "Largest Contentful Paint is slow", impact: "high", fixHint: "Optimize images" },
      { title: "Menu hard to find", impact: "medium", fixHint: "Add menu link" },
    ],
    opportunities: [{ title: "Win more map pack clicks", impactEstimate: "Medium" }],
    competitors: [
      {
        name: "Peer Kitchen",
        note: "4.5★",
        mockScore: 81,
        source: "places",
        rating: 4.5,
        reviewCount: 900,
        photoCount: 80,
      },
      {
        name: "Fake Estimated",
        note: "est",
        mockScore: 70,
        source: "estimated",
      },
    ],
    gated: {
      keywordOpportunities: [],
      competitorDeepDive: [],
      roadmap: { days30: [], days60: [], days90: [] },
    },
    evidencePack: {
      version: 1,
      collectedAt: new Date().toISOString(),
      restaurantName: "Test Bistro",
      city: "London",
      websiteUrl: "https://example.com",
      userSocial: {},
      urlSignals: { fetched: true } as never,
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
    opportunityReport: {
      version: "opportunity-v2",
      place_id: null,
      name: "Test Bistro",
      status: "qualified",
      disqualifiers: [],
      opportunity_score: {
        revenue_potential: 3,
        marketing_maturity: 48,
        likelihood_to_buy: 70,
        est_monthly_lost_customers: 40,
        est_lost_revenue: 1200,
        currency: "GBP",
      },
      fit_proxy: 70,
      reasons: [],
      personalization_hooks: [],
      recommended_email_angle: null,
      locationLabel: "1 location",
      topFixes: [
        { title: "Respond to Google reviews", detail: "Guests trust places that reply", customersPerMonth: 18 },
        { title: "Improve your homepage", detail: "Clearer path to book", customersPerMonth: 14 },
        { title: "Update Google photos", detail: "Fresh photos win", customersPerMonth: 8 },
      ],
      growthScore: 52,
      projectedGrowthScore: 68,
    },
    restaurantScores: {
      overall: 52,
      grade: "C",
      reviews: 50,
      gbp: 55,
      website: 48,
      competitors: 60,
      technical: 50,
      confidence: "medium",
    },
    ...over,
  } as AuditResultPayload;
}

describe("growthPotentialFromScore", () => {
  it("maps low health to VERY_HIGH potential", () => {
    expect(growthPotentialFromScore(40)).toBe("VERY_HIGH");
    expect(growthPotentialFromScore(55)).toBe("HIGH");
    expect(growthPotentialFromScore(70)).toBe("MEDIUM");
    expect(growthPotentialFromScore(80)).toBe("LOW");
  });
});

describe("customerRangeFromPoint", () => {
  it("always returns a range not a point", () => {
    const r = customerRangeFromPoint(40);
    expect(r.high).toBeGreaterThan(r.low);
    expect(r.low).toBeGreaterThanOrEqual(5);
  });
});

describe("revenueRangeFromCustomers", () => {
  it("scales with AOV and stays ranged", () => {
    const r = revenueRangeFromCustomers(30, 50, 30);
    expect(r.high).toBeGreaterThan(r.low);
    expect(r.low % 25).toBe(0);
  });
});

describe("buildGrowthReportV2", () => {
  it("builds V2 report with customer ranges (no revenue £) and max 5 improvements", () => {
    const report = buildGrowthReportV2(basePayload(), {
      restaurantName: "Test Bistro",
      city: "London",
      websiteUrl: "https://example.com",
      analysedAt: new Date("2026-07-01"),
    });
    expect(report.version).toBe("growth-report-v2");
    expect(report.hero.title).toBe("Restaurant Growth Report");
    expect(report.monthlyOpportunity.customersHigh).toBeGreaterThan(
      report.monthlyOpportunity.customersLow,
    );
    expect(report.monthlyOpportunity).not.toHaveProperty("revenueLowGbp");
    expect(report.monthlyOpportunity).not.toHaveProperty("revenueHighGbp");
    expect(report.topImprovements.length).toBeLessThanOrEqual(5);
    expect(report.topImprovements.length).toBeGreaterThan(0);
    expect(report.channelImpact.find((c) => c.channel === "Instagram")?.impact).toBe("Unknown");
  });

  it("excludes estimated competitors and keeps places peers", () => {
    const report = buildGrowthReportV2(basePayload(), {
      restaurantName: "Test Bistro",
      city: "London",
      websiteUrl: null,
      analysedAt: "2026-07-01",
    });
    expect(report.competitors.every((c) => c.name !== "Fake Estimated")).toBe(true);
    expect(report.competitors[0]?.name).toBe("Peer Kitchen");
    expect(report.competitors[0]?.rating).toBe(4.5);
  });

  it("rewrites LCP jargon into plain website health language", () => {
    const report = buildGrowthReportV2(basePayload(), {
      restaurantName: "Test Bistro",
      city: "London",
      websiteUrl: null,
      analysedAt: new Date(),
    });
    expect(report.websiteHealth.some((w) => /loads slower/i.test(w.statement))).toBe(true);
    expect(report.websiteHealth.every((w) => !/LCP|CLS|schema/i.test(w.statement))).toBe(true);
  });

  it("does not invent peer photo averages when peers lack photoCount", () => {
    const report = buildGrowthReportV2(
      basePayload({
        competitors: [
          {
            name: "No Photos Peer",
            note: "x",
            mockScore: 80,
            source: "places",
            rating: 4.4,
            reviewCount: 100,
          },
        ],
      }),
      {
        restaurantName: "Test",
        city: "London",
        websiteUrl: null,
        analysedAt: new Date(),
      },
    );
    const photos = report.benchmarks.find((b) => /photo/i.test(b.label));
    expect(photos?.similar).toBe("—");
  });
});
