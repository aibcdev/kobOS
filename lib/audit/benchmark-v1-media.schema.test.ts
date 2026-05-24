import { describe, expect, it } from "vitest";
import {
  benchmarkV1MediaResultSchema,
  mergeBenchmarkV1MediaIntoPayload,
  normalizeBenchmarkV1MediaJson,
} from "@/lib/audit/gemini-benchmark-media";
import type { AuditResultPayload, BenchmarkV1Result } from "@/lib/audit/types";

const minimalSection = {
  score: 70,
  confidence: "medium" as const,
  checks: [
    {
      id: "lighting",
      pass: true,
      detail: "Even lighting on hero dish per mediaAssetsMeta[0].ref og_image.",
      evidenceRef: "mediaAssetsMeta[0].ref",
    },
  ],
  topGaps: ["More lifestyle shots"],
  nextActions: ["Add golden-hour exterior"],
};

describe("benchmarkV1MediaResultSchema", () => {
  it("accepts valid payload", () => {
    const parsed = benchmarkV1MediaResultSchema.safeParse({
      visualBrandQuality: minimalSection,
      visualSummary: "Strong appetite appeal.",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid visual score", () => {
    const parsed = benchmarkV1MediaResultSchema.safeParse({
      visualBrandQuality: { ...minimalSection, score: 101 },
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts string checks after normalization", () => {
    const normalized = normalizeBenchmarkV1MediaJson({
      visualBrandQuality: {
        score: 82,
        confidence: "medium",
        checks: ["Hero image has strong appetite appeal and consistent brand colors."],
        topGaps: [],
        nextActions: [],
      },
    });
    const parsed = benchmarkV1MediaResultSchema.safeParse(normalized);
    expect(parsed.success).toBe(true);
  });
});

describe("mergeBenchmarkV1MediaIntoPayload", () => {
  const benchmark: BenchmarkV1Result = {
    version: 1,
    model: "gemini-2.0-flash",
    scoredAt: "2026-01-01T00:00:00.000Z",
    seo: { ...minimalSection, score: 80 },
    websiteExperience: { ...minimalSection, score: 60 },
    brandSocialPresence: { ...minimalSection, score: 50 },
  };

  it("blends design and six-way overall when text benchmark exists", () => {
    const payload: AuditResultPayload = {
      scores: { overall: 70, seo: 80, design: 60, mobile: 70, conversion: 60 },
      issues: [],
      opportunities: [],
      competitors: [],
      teaser: { headline: "", subline: "", paletteNote: "" },
      gated: {
        keywordOpportunities: [],
        roadmap: { days30: [], days60: [], days90: [] },
        competitorDeepDive: [],
        redesignPreviewNotes: "",
      },
      benchmarkV1: benchmark,
      benchmarkV1Status: "ready",
    };

    const media = {
      version: 1 as const,
      model: "gemini-2.0-flash",
      scoredAt: "2026-01-01T00:00:01.000Z",
      visualBrandQuality: { ...minimalSection, score: 100 },
    };

    const merged = mergeBenchmarkV1MediaIntoPayload(payload, media);
    expect(merged.scores.design).toBe(Math.round(60 * 0.65 + 100 * 0.35));
    const expectedOverall = Math.round((80 + 60 + 50 + 70 + 60 + 100) / 6);
    expect(merged.scores.overall).toBe(expectedOverall);
    expect(merged.benchmarkV1MediaStatus).toBe("ready");
  });
});
