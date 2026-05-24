import { describe, expect, it } from "vitest";
import { mergeBenchmarkV1IntoPayload } from "@/lib/audit/gemini-benchmark-score";
import type { AuditResultPayload, BenchmarkV1Result } from "@/lib/audit/types";

function section(score: number) {
  return {
    score,
    confidence: "high" as const,
    checks: [{ id: "test", pass: true, detail: "x", evidenceRef: "test" }],
    topGaps: [],
    nextActions: [],
  };
}

describe("mergeBenchmarkV1IntoPayload", () => {
  it("does not let Gemini drag rubric anchor scores far below baseline", () => {
    const payload: AuditResultPayload = {
      scores: { overall: 84, seo: 84, design: 84, mobile: 80, conversion: 75 },
      scoresPending: false,
      rubricV2: {
        version: 2,
        scoredAt: new Date().toISOString(),
        confidence: "high",
        seo: 84,
        websiteExperience: 84,
        brandSocialPresence: 72,
        overall: 84,
        mobile: 80,
        conversion: 75,
        checks: [],
        anchorHost: "kfc.com",
      },
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
    };

    const benchmark: BenchmarkV1Result = {
      version: 1,
      model: "test",
      scoredAt: new Date().toISOString(),
      seo: section(42),
      websiteExperience: section(40),
      brandSocialPresence: section(38),
    };

    const merged = mergeBenchmarkV1IntoPayload(payload, benchmark);
    expect(merged.scores.overall).toBeGreaterThanOrEqual(76);
    expect(merged.scores.seo).toBeGreaterThanOrEqual(76);
    expect(merged.benchmarkV1?.seo.score).toBeGreaterThanOrEqual(76);
  });
});
