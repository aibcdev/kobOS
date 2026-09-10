import { applyRestaurantScoresToPayload } from "@/lib/audit/restaurant-scoring";
import type { AuditResultPayload } from "@/lib/audit/types";

/**
 * Single source of truth for the headline score.
 *
 * The report ring reads `restaurantScores.overall` while the pillar bars read the
 * VisibilityAudit columns. Async steps (Browserbase render, Gemini media) change the
 * evidence after the first scoring pass, so the two can disagree unless every write
 * goes through here. Recomputing is cheap and pure — no network, no AI.
 */
export function finalizeAuditScores(payload: AuditResultPayload): AuditResultPayload {
  const hasEvidence = Boolean(payload.evidencePack) || payload.restaurantScores != null;
  if (!hasEvidence) return payload;
  return applyRestaurantScoresToPayload(payload);
}

/** Column values for VisibilityAudit, always taken from one finalized payload. */
export function auditScoreColumns(payload: AuditResultPayload): {
  overallScore: number;
  seoScore: number;
  designScore: number;
  mobileScore: number;
  conversionScore: number;
} {
  return {
    overallScore: payload.restaurantScores?.overall ?? payload.scores.overall,
    seoScore: payload.scores.seo,
    designScore: payload.scores.design,
    mobileScore: payload.scores.mobile,
    conversionScore: payload.scores.conversion,
  };
}
