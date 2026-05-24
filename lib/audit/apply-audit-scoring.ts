import type { AuditNetworkFact } from "@/lib/audit/network-capture";
import { fetchPageSpeedInsights } from "@/lib/audit/pagespeed-insights";
import { applyRubricV2ToPayload, computeRubricV2 } from "@/lib/audit/rubric-v2";
import type { AuditResultPayload } from "@/lib/audit/types";
import type { AuditStagehandExtraction } from "@/lib/browserbase/stagehand-schema";
import type { AuditVisualIntelligenceResult } from "@/lib/audit/visual-intelligence";

/** PageSpeed + rubric v2 — replaces heuristic headline scores when scan completes. */
export async function applyAuditScoringV2(
  payload: AuditResultPayload,
  extras?: {
    networkFacts?: AuditNetworkFact[] | null;
    visualMetrics?: AuditVisualIntelligenceResult | null;
    stagehandExtraction?: AuditStagehandExtraction | null;
  },
): Promise<AuditResultPayload> {
  if (!payload.evidencePack) return { ...payload, scoresPending: false };

  const url = payload.evidencePack.websiteUrl;
  const pageSpeed = url ? await fetchPageSpeedInsights(url) : null;

  if (pageSpeed && !pageSpeed.error) {
    payload = {
      ...payload,
      evidencePack: { ...payload.evidencePack, pageSpeed },
    };
  }

  const pack = payload.evidencePack;
  const networkFacts = extras?.networkFacts ?? pack?.networkFacts ?? null;
  if (networkFacts?.length && pack) {
    payload = {
      ...payload,
      evidencePack: { ...pack, networkFacts },
    };
  }

  const evidencePack = payload.evidencePack;
  if (!evidencePack) return { ...payload, scoresPending: false };

  const rubric = computeRubricV2({
    evidencePack,
    pageSpeed,
    visualMetrics: extras?.visualMetrics ?? payload.visualMetrics ?? null,
    stagehandExtraction: extras?.stagehandExtraction ?? payload.stagehandExtraction ?? null,
    networkFacts,
  });

  return applyRubricV2ToPayload(payload, rubric);
}
