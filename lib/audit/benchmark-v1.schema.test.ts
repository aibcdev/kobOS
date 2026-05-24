import { describe, expect, it } from "vitest";
import { benchmarkV1ResultSchema } from "@/lib/audit/gemini-benchmark-score";

const minimalSection = {
  score: 72,
  confidence: "high" as const,
  checks: [
    {
      id: "test_check",
      pass: true,
      detail: "Evidence-backed note per rubric.",
      evidenceRef: "urlSignals.hasViewport",
    },
  ],
  topGaps: ["Gap one"],
  nextActions: ["Action one"],
};

describe("benchmarkV1ResultSchema", () => {
  it("accepts valid full payload", () => {
    const parsed = benchmarkV1ResultSchema.safeParse({
      seo: minimalSection,
      websiteExperience: { ...minimalSection, score: 65 },
      brandSocialPresence: { ...minimalSection, score: 58 },
      overallSummary: "Summary line.",
      anchorCalibrationNote: "Anchored to elite bar.",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid scores", () => {
    const parsed = benchmarkV1ResultSchema.safeParse({
      seo: { ...minimalSection, score: 101 },
      websiteExperience: minimalSection,
      brandSocialPresence: minimalSection,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects empty checks", () => {
    const parsed = benchmarkV1ResultSchema.safeParse({
      seo: { ...minimalSection, checks: [] },
      websiteExperience: minimalSection,
      brandSocialPresence: minimalSection,
    });
    expect(parsed.success).toBe(false);
  });
});

/** Golden bands: high-tier synthetic scores must stay in 88–96 when all checks pass (regression guard on schema only). */
describe("golden score bands (structure)", () => {
  it("allows elite-tier section scores", () => {
    const elite = {
      ...minimalSection,
      score: 92,
      checks: minimalSection.checks.map((c) => ({ ...c, pass: true })),
    };
    const parsed = benchmarkV1ResultSchema.safeParse({
      seo: elite,
      websiteExperience: { ...elite, score: 93 },
      brandSocialPresence: { ...elite, score: 91 },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.seo.score).toBeGreaterThanOrEqual(88);
      expect(parsed.data.seo.score).toBeLessThanOrEqual(100);
    }
  });
});
