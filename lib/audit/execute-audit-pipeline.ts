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
  for (const s of sends) {
    try {
      await inngest.send(s);
    } catch (inngestErr) {
      console.warn("[audit/pipeline] Inngest send skipped", s.name, inngestErr);
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
    const { payload, row, queueAsyncBrowserbase } = await buildAuditResult({
      websiteUrl: input.websiteUrl,
      siteScope: input.siteScope,
      userSocial: input.userSocial,
      userImageUrls: input.userImageUrls?.length ? input.userImageUrls : undefined,
      place: input.place,
    });

    const placesCompetitors = payload.competitors.filter((c) => c.source === "places").length;
    const pipelineStage = [
      `geo:${payload.geoLocation?.source ?? "none"}`,
      `competitors:places=${placesCompetitors}/${payload.competitors.length}`,
      `scan:${payload.scanStatus ?? "unknown"}`,
    ].join(";");

    const payloadWithStage: AuditResultPayload = {
      ...payload,
      browserbaseScan: {
        capturedAt: payload.browserbaseScan?.capturedAt ?? new Date().toISOString(),
        mode: payload.browserbaseScan?.mode ?? "sync",
        ...payload.browserbaseScan,
        pipelineStage,
      },
    };

    await prisma.visibilityAudit.update({
      where: { id: auditId },
      data: {
        restaurantName: row.restaurantName,
        city: row.city,
        websiteUrl: row.websiteUrl,
        overallScore: row.overallScore,
        seoScore: row.seoScore,
        designScore: row.designScore,
        mobileScore: row.mobileScore,
        conversionScore: row.conversionScore,
        resultPayload: payloadWithStage as Prisma.InputJsonValue,
      },
    });

    await upsertSiteScanForAudit(auditId, payloadWithStage);
    await enqueuePostScanJobs(auditId, queueAsyncBrowserbase);
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
