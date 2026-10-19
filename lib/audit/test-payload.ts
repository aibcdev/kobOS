import type { AuditResultPayload } from "@/lib/audit/types";

/** Minimal valid payload for scoring tests; pass only the fields the test cares about. */
export function testAuditPayload(overrides: Partial<AuditResultPayload> = {}): AuditResultPayload {
  return {
    scores: { overall: 0, seo: 0, design: 0, mobile: 0, conversion: 0 },
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
    ...overrides,
  };
}
