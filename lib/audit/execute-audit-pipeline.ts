import type { Prisma } from "@prisma/client";
import type { AuditUserSocialInput } from "@/lib/audit/evidence-pack";
import { buildAuditResult } from "@/lib/audit/build-result";
import { upsertSiteScanForAudit } from "@/lib/audit/persist-site-scan";
import { parseAuditPayload, type AuditResultPayload } from "@/lib/audit/types";
import { prisma } from "@/lib/db/prisma";
import { isGeminiConfigured } from "@/lib/ai/gemini-config";
import { inngest } from "@/inngest/client";

export type AuditPipelineInput = {
  websiteUrl: string;
  siteScope: "one" | "multiple";
  userSocial?: AuditUserSocialInput | null;
  userImageUrls?: string[] | null;
  /** Prefer lead/audit city over the "Your area" bootstrap. */
  fallbackCity?: string | null;
  place?: {
    name?: string;
    placeId?: string;
    formattedAddress?: string;
    lat?: number | null;
    lng?: number | null;
  } | null;
};

async function enqueuePostScanJobs(
  auditId: string,
  queueAsyncBrowserbase: boolean,
): Promise<void> {
  if (queueAsyncBrowserbase) {
    try {
      await inngest.send({
        name: "audit/browserbase.requested",
        data: { auditId },
      });
    } catch (inngestErr) {
      console.warn("[audit/pipeline] Browserbase Inngest send skipped", inngestErr);
    }
    return;
  }

  const sends: { name: string; data: { auditId: string } }[] = [];
  if (isGeminiConfigured()) {
    sends.push({ name: "audit/enrichment.requested", data: { auditId } });
  }
  if (process.env.GEMINI_API_KEY?.trim()) {
    sends.push({ name: "audit/gemini-benchmark.requested", data: { auditId } });
  }

  let geminiEnqueued = false;
  for (const s of sends) {
    try {
      await inngest.send(s);
      if (s.name === "audit/gemini-benchmark.requested") geminiEnqueued = true;
    } catch (inngestErr) {
      console.warn("[audit/pipeline] Inngest send skipped", s.name, inngestErr);
    }
  }

  // If Inngest is down, still unblock Overview with perception (and continue suite inline).
  if (process.env.GEMINI_API_KEY?.trim() && !geminiEnqueued) {
    try {
      const { runAndPersistGeminiAuditSuite } = await import("@/lib/audit/persist-gemini-audit");
      await runAndPersistGeminiAuditSuite(auditId);
    } catch (inlineErr) {
      console.warn("[audit/pipeline] Inline Gemini suite failed", inlineErr);
      try {
        const { markAiJobsUnavailable } = await import("@/lib/audit/persist-gemini-audit");
        await markAiJobsUnavailable(
          auditId,
          inlineErr instanceof Error ? inlineErr.message : "Inline Gemini suite failed",
        );
      } catch {
        /* ignore */
      }
    }
  } else if (process.env.GEMINI_API_KEY?.trim() && geminiEnqueued) {
    // Unblock Overview immediately; Inngest continues with benchmark + media.
    try {
      const { runAndPersistPerceptionStep } = await import("@/lib/audit/persist-gemini-audit");
      await runAndPersistPerceptionStep(auditId);
    } catch (perceptionErr) {
      console.warn("[audit/pipeline] Inline perception failed", perceptionErr);
    }
  }
}

function failedPayload(prev: AuditResultPayload | null, message: string): AuditResultPayload {
  const base =
    prev ??
    ({
      scores: { overall: 35, seo: 35, design: 35, mobile: 35, conversion: 35 },
      issues: [],
      opportunities: [],
      competitors: [],
      teaser: { headline: "Scan failed", subline: message, paletteNote: "" },
      gated: {
        keywordOpportunities: [],
        roadmap: { days30: [], days60: [], days90: [] },
        competitorDeepDive: [],
        redesignPreviewNotes: "",
      },
    } satisfies AuditResultPayload);

  return {
    ...base,
    scoresPending: false,
    scanStatus: "failed",
    browserbaseScan: {
      capturedAt: new Date().toISOString(),
      mode: "async-failed",
      errorMessage: message.slice(0, 500),
    },
  };
}

/** Runs full audit analysis and updates an existing pending VisibilityAudit row. */
export async function executeAuditPipeline(auditId: string, input: AuditPipelineInput): Promise<void> {
  const existing = await prisma.visibilityAudit.findUnique({ where: { id: auditId } });
  if (!existing) {
    throw new Error(`executeAuditPipeline: audit ${auditId} not found`);
  }

  const prevPayload = parseAuditPayload(existing.resultPayload);

  try {
    const cityHint =
      input.fallbackCity?.trim() ||
      (existing.city?.trim() && existing.city.trim() !== "Your area" ? existing.city.trim() : null);

    const { payload, row, queueAsyncBrowserbase } = await buildAuditResult({
      websiteUrl: input.websiteUrl,
      siteScope: input.siteScope,
      userSocial: input.userSocial,
      userImageUrls: input.userImageUrls?.length ? input.userImageUrls : undefined,
      place: input.place,
      fallbackCity: cityHint,
    });

    const { applyRestaurantScoresToPayload } = await import("@/lib/audit/restaurant-scoring");
    const scoredPayload = applyRestaurantScoresToPayload(payload);
    const scoredRow = {
      ...row,
      overallScore: scoredPayload.scores.overall,
    };

    const placesCompetitors = scoredPayload.competitors.filter((c) => c.source === "places").length;
    const pipelineStage = [
      `geo:${payload.geoLocation?.source ?? "none"}`,
      `competitors:places=${placesCompetitors}/${payload.competitors.length}`,
      `scan:${payload.scanStatus ?? "unknown"}`,
    ].join(";");

    const payloadWithStage: AuditResultPayload = {
      ...scoredPayload,
      ...(prevPayload?.discovery ? { discovery: prevPayload.discovery } : {}),
      browserbaseScan: {
        capturedAt: scoredPayload.browserbaseScan?.capturedAt ?? new Date().toISOString(),
        mode: scoredPayload.browserbaseScan?.mode ?? "sync",
        ...scoredPayload.browserbaseScan,
        pipelineStage,
      },
    };

    const resolvedCity =
      scoredRow.city?.trim() && scoredRow.city.trim() !== "Your area"
        ? scoredRow.city.trim()
        : cityHint || existing.city;

    await prisma.visibilityAudit.update({
      where: { id: auditId },
      data: {
        restaurantName: scoredRow.restaurantName,
        city: resolvedCity,
        websiteUrl: scoredRow.websiteUrl,
        overallScore: scoredRow.overallScore,
        seoScore: scoredRow.seoScore,
        designScore: scoredRow.designScore,
        mobileScore: scoredRow.mobileScore,
        conversionScore: scoredRow.conversionScore,
        resultPayload: payloadWithStage as Prisma.InputJsonValue,
      },
    });

    await upsertSiteScanForAudit(auditId, payloadWithStage);
    await enqueuePostScanJobs(auditId, queueAsyncBrowserbase);

    // Bind live analysis steps + restaurant scores from available signals
    try {
      const { syncAnalysisProgressFromPayload, persistAnalysisPayload } = await import(
        "@/lib/audit/analysis-progress"
      );
      const { applyOpportunityReportToPayload } = await import(
        "@/lib/audit/audit-opportunity-from-payload"
      );
      const synced = syncAnalysisProgressFromPayload(payloadWithStage);
      const withOpp = await applyOpportunityReportToPayload(synced, {
        name: scoredRow.restaurantName,
        city: resolvedCity,
        websiteUrl: scoredRow.websiteUrl,
      });
      await persistAnalysisPayload(auditId, withOpp);
    } catch (progressErr) {
      console.warn("[audit/pipeline] analysis progress sync failed", progressErr);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[audit/pipeline]", auditId, e);
    const failed = failedPayload(prevPayload, msg);
    await prisma.visibilityAudit.update({
      where: { id: auditId },
      data: {
        resultPayload: failed,
        overallScore: failed.scores.overall,
        seoScore: failed.scores.seo,
        designScore: failed.scores.design,
        mobileScore: failed.scores.mobile,
        conversionScore: failed.scores.conversion,
      },
    });
    throw e;
  }
}
