import type { AuditResultPayload } from "@/lib/audit/types";

const EMPTY_GATED: AuditResultPayload["gated"] = {
  keywordOpportunities: [],
  roadmap: { days30: [], days60: [], days90: [] },
  competitorDeepDive: [],
  redesignPreviewNotes: "",
};

/**
 * Server-side strip for locked (pre-lead) report views.
 * Keeps Opportunity Report + teaser signals; removes gated roadmap / full perception / deep evidence.
 */
export function stripAuditPayloadForPublic(payload: AuditResultPayload): AuditResultPayload {
  const screenshot = payload.browserbaseScan?.screenshotPublicUrl?.trim() || undefined;

  return {
    ...payload,
    scoresPending: payload.scoresPending,
    scores: payload.scores,
    issues: payload.issues.slice(0, 8).map((i) => ({
      title: i.title,
      impact: i.impact,
      fixHint: i.fixHint.slice(0, 280),
    })),
    opportunities: payload.opportunities.slice(0, 6).map((o) => ({
      title: o.title,
      impactEstimate: o.impactEstimate.slice(0, 120),
    })),
    competitors: payload.competitors.slice(0, 5).map((c) => ({
      name: c.name,
      note: c.note,
      mockScore: c.mockScore,
      lat: c.lat,
      lng: c.lng,
      source: c.source,
      rating: c.rating ?? null,
      reviewCount: c.reviewCount ?? null,
      photoCount: c.photoCount ?? null,
      websiteUrl: c.websiteUrl ?? null,
    })),
    geoLocation: payload.geoLocation ?? null,
    teaser: payload.teaser,
    scanStatus: payload.scanStatus,
    browserbaseScan: screenshot
      ? {
          capturedAt: payload.browserbaseScan!.capturedAt,
          mode: payload.browserbaseScan!.mode,
          screenshotPublicUrl: screenshot,
        }
      : undefined,
    visualMetrics: undefined,
    stagehandExtraction: undefined,
    gated: EMPTY_GATED,
    aiNarrative: undefined,
    evidencePack: undefined,
    benchmarkV1Status: "pending",
    benchmarkV1: null,
    benchmarkV1Error: undefined,
    benchmarkV1MediaStatus: "pending",
    benchmarkV1Media: null,
    benchmarkV1MediaError: undefined,
    perceptionAuditV1Status: payload.perceptionAuditV1Status ?? "pending",
    perceptionAuditV1: null,
    perceptionAuditV1Error: undefined,
    restaurantScores: payload.restaurantScores,
    analysisProgress: payload.analysisProgress,
    opportunityReport: payload.opportunityReport,
  };
}
