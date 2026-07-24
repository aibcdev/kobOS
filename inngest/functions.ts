import { cron } from "inngest";
import { persistAiRecommendations } from "@/lib/ai/recommendations";
import { isGeminiConfigured } from "@/lib/ai/gemini-config";
import { analyzeWebsiteFromHtml } from "@/lib/audit/analyze-url";
import { applyAuditScoringV2 } from "@/lib/audit/apply-audit-scoring";
import { auditPageTextPreview } from "@/lib/audit/audit-page-text-preview";
import { enrichAuditNarrative } from "@/lib/audit/enrich-openai";
import type { ImageCandidateUrl } from "@/lib/audit/analyze-url";
import type { AuditUserSocialInput } from "@/lib/audit/evidence-pack";
import { upsertSiteScanForAudit } from "@/lib/audit/persist-site-scan";
import { finalizePendingAuditScan, failPendingAuditScan } from "@/lib/audit/finalize-pending-scan";
import { parseAuditPayload, type AuditResultPayload } from "@/lib/audit/types";
import { isBrowserbaseConfigured } from "@/lib/browserbase/browserbase-config";
import { isStagehandAuditEnabled } from "@/lib/browserbase/stagehand-config";
import type { StagehandRenderedPage } from "@/lib/browserbase/stagehand-scan";
import { saveDigestRun } from "@/lib/digest/build-snapshot";
import { prisma } from "@/lib/db/prisma";
import { generateOutboundDraft } from "@/lib/growth-agent/generate-outbound-draft";
import { persistOutboundDraftLeads } from "@/lib/growth-agent/persist-outbound-leads";
import { importAuditLeadsToOutbound } from "@/lib/outbound/import-audit-leads";
import { isUkColdOutboundMode } from "@/lib/outbound/icp-config";
import { runLeadFinder } from "@/lib/lead-engine/run-lead-finder";
import { runOpportunityAnalyzer } from "@/lib/lead-engine/run-opportunity-analyzer";
import { runOutreachWriter } from "@/lib/lead-engine/run-outreach-writer";
import { sendOutboundEmailViaResend } from "@/lib/outbound/send-resend-outbound-email";
import { runUkColdPipeline } from "@/lib/outbound/run-uk-cold-pipeline";
import { detectInsightsFromRules } from "@/lib/growth/detect";
import { summarizeMetadata } from "@/lib/growth/normalize";
import { type Integration, OutboundLeadStatus } from "@prisma/client";
import { inngest } from "./client";

export type GrowthNormalizationData = {
  restaurantId: string;
};

/** Hourly ingestion entrypoint — fans out normalization jobs per restaurant. */
export const ingestionHourly = inngest.createFunction(
  {
    id: "growth-ingestion-hourly",
    name: "Growth · hourly ingestion",
    triggers: [cron("5 * * * *")],
  },
  async ({ step }) => {
    const restaurants = await step.run("list-restaurants", () =>
      prisma.restaurant.findMany({ select: { id: true } }),
    );

    await step.run("enqueue-normalizations", async () => {
      if (!restaurants.length) {
        return 0;
      }
      await inngest.send(
        restaurants.map((r) => ({
          name: "growth/normalization.requested",
          data: { restaurantId: r.id } satisfies GrowthNormalizationData,
        })),
      );
      return restaurants.length;
    });

    return { restaurants: restaurants.length };
  },
);

export const normalizationRequested = inngest.createFunction(
  {
    id: "growth-normalization",
    name: "Growth · normalization",
    triggers: [{ event: "growth/normalization.requested" }],
  },
  async ({ event, step }) => {
    const restaurantId = event.data.restaurantId;
    if (!restaurantId || typeof restaurantId !== "string") {
      throw new Error("growth/normalization.requested missing restaurantId");
    }

    const summary = await step.run("load-integrations-metadata", async () => {
      const integrations: Integration[] = await prisma.integration.findMany({
        where: { restaurantId },
      });
      return integrations.map((int) => ({
        provider: int.provider,
        metadataSummary: summarizeMetadata(int.metadata),
        connectedAt: int.connectedAt.toISOString(),
      }));
    });

    await step.run("emit-post-normalization-events", async () => {
      await inngest.send([
        {
          name: "growth/insight.detection.requested",
          data: { restaurantId },
        },
        {
          name: "growth/normalization.completed",
          data: { restaurantId, integrationProfiles: summary },
        },
      ]);
    });

    return { restaurantId };
  },
);

export const insightDetection = inngest.createFunction(
  {
    id: "growth-insight-detection",
    name: "Growth · insight detection",
    triggers: [{ event: "growth/insight.detection.requested" }],
  },
  async ({ event, step }) => {
    const restaurantId = event.data.restaurantId;
    if (!restaurantId || typeof restaurantId !== "string") {
      throw new Error("growth/insight.detection.requested missing restaurantId");
    }

    const created = await step.run("detect-rules", async () => detectInsightsFromRules(restaurantId));

    await step.run("enqueue-ai-recommendations", async () => {
      await inngest.send({
        name: "growth/recommendations.ai.requested",
        data: { restaurantId },
      });
    });

    return { restaurantId, created };
  },
);

export const aiRecommendations = inngest.createFunction(
  {
    id: "growth-ai-recommendations",
    name: "Growth · AI recommendations",
    triggers: [{ event: "growth/recommendations.ai.requested" }],
  },
  async ({ event, step }) => {
    const restaurantId = event.data.restaurantId;
    if (!restaurantId || typeof restaurantId !== "string") {
      throw new Error("growth/recommendations.ai.requested missing restaurantId");
    }

    if (!isGeminiConfigured()) {
      return { restaurantId, skipped: true, reason: "no_gemini_key" };
    }

    if (process.env.GROWTH_AUTO_AI_RECOMMENDATIONS !== "1") {
      return { restaurantId, skipped: true, reason: "growth_auto_ai_recommendations_off" };
    }

    const { created } = await step.run("openai-write-recommendations", async () =>
      persistAiRecommendations(restaurantId),
    );

    return { restaurantId, created };
  },
);

export const auditRunPipeline = inngest.createFunction(
  {
    id: "audit-run-pipeline",
    name: "Audit · background run",
    triggers: [{ event: "audit/run.requested" }],
  },
  async ({ event, step }) => {
    const auditId = event.data.auditId;
    const websiteUrl = event.data.websiteUrl;
    if (!auditId || typeof auditId !== "string") {
      throw new Error("audit/run.requested missing auditId");
    }
    if (!websiteUrl || typeof websiteUrl !== "string") {
      throw new Error("audit/run.requested missing websiteUrl");
    }

    const siteScope = event.data.siteScope === "multiple" ? "multiple" : "one";
    const userSocial = (event.data.userSocial ?? null) as AuditUserSocialInput | null;
    const userImageUrls = Array.isArray(event.data.userImageUrls)
      ? (event.data.userImageUrls as string[])
      : null;
    const place =
      event.data.placePlaceId ||
      event.data.placeLat != null ||
      event.data.placeLng != null ||
      event.data.placeFormattedAddress ||
      event.data.placeLabel
        ? {
            name: typeof event.data.placeLabel === "string" ? event.data.placeLabel : undefined,
            placeId: typeof event.data.placePlaceId === "string" ? event.data.placePlaceId : undefined,
            formattedAddress:
              typeof event.data.placeFormattedAddress === "string" ? event.data.placeFormattedAddress : undefined,
            lat: typeof event.data.placeLat === "number" ? event.data.placeLat : null,
            lng: typeof event.data.placeLng === "number" ? event.data.placeLng : null,
          }
        : null;

    await step.run("execute-audit-pipeline", async () => {
      const { executeAuditPipeline } = await import("@/lib/audit/execute-audit-pipeline");
      try {
        return await executeAuditPipeline(auditId, {
          websiteUrl,
          siteScope,
          userSocial,
          userImageUrls,
          place,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await failPendingAuditScan(auditId, msg);
        throw e;
      }
    });

    return { auditId };
  },
);

export const auditBrowserbaseScan = inngest.createFunction(
  {
    id: "audit-browserbase-scan",
    name: "Audit · Browserbase render",
    triggers: [{ event: "audit/browserbase.requested" }],
  },
  async ({ event, step }) => {
    const auditId = event.data.auditId;
    if (!auditId || typeof auditId !== "string") {
      throw new Error("audit/browserbase.requested missing auditId");
    }

    if (!isBrowserbaseConfigured()) {
      await step.run("finalize-pending-without-browserbase", async () => finalizePendingAuditScan(auditId));
      return { auditId, skipped: true, reason: "no_browserbase" };
    }

    const result = await step.run("browserbase-render-and-merge", async () => {
      const audit = await prisma.visibilityAudit.findUnique({ where: { id: auditId } });
      if (!audit?.websiteUrl?.trim()) {
        return { ok: false as const, reason: "no_url" };
      }

      const prev = parseAuditPayload(audit.resultPayload);
      if (!prev) {
        return { ok: false as const, reason: "bad_payload" };
      }

      const websiteUrl = audit.websiteUrl.trim();

      try {
        const useStagehand = isStagehandAuditEnabled();
        const { fetchRenderedPageWithRetry } = await import("@/lib/browserbase/fetch-page");
        const { buildAuditPayloadAndRow } = await import("@/lib/audit/build-result");
        const page = useStagehand
          ? await (async () => {
              const { fetchRenderedPageViaStagehandWithRetry } = await import("@/lib/browserbase/stagehand-scan");
              return fetchRenderedPageViaStagehandWithRetry(
                websiteUrl,
                { restaurantName: audit.restaurantName, city: audit.city },
                2,
              );
            })()
          : await fetchRenderedPageWithRetry(websiteUrl, 2);
        const analysis = analyzeWebsiteFromHtml(page.html, page.finalUrl, {
          httpStatus: page.statusCode ?? undefined,
        });

        const userUrls =
          prev.evidencePack?.imageCandidates
            ?.filter((c: ImageCandidateUrl) => c.source === "user:supplied")
            .map((c: ImageCandidateUrl) => c.url) ?? undefined;

        const stagehandExtraction: StagehandRenderedPage["stagehandExtraction"] | undefined = useStagehand
          ? (page as StagehandRenderedPage).stagehandExtraction
          : undefined;

        let { payload } = buildAuditPayloadAndRow(
          {
            restaurantName: audit.restaurantName,
            city: audit.city,
            websiteUrl: audit.websiteUrl,
            userSocial: prev.evidencePack?.userSocial,
            userImageUrls: userUrls?.length ? userUrls : undefined,
            multiSiteOrigins: prev.evidencePack?.multiSiteOrigins ?? null,
          },
          analysis,
          {
            browserbaseScan: {
              sessionId: page.sessionId,
              capturedAt: new Date().toISOString(),
              finalUrl: page.finalUrl,
              mode: "async-complete",
              approximateMarkdownSnippet: auditPageTextPreview(page.html),
              screenshotPublicUrl: page.screenshotPublicUrl,
            },
            scanStatus: "ready",
            deferInitialAiJobs: false,
            visualMetrics: page.visualMetrics,
            stagehandExtraction,
          },
        );

        payload = await applyAuditScoringV2(payload, {
          networkFacts: page.networkFacts,
          visualMetrics: page.visualMetrics,
          stagehandExtraction,
        });

        await prisma.visibilityAudit.update({
          where: { id: auditId },
          data: {
            overallScore: payload.scores.overall,
            seoScore: payload.scores.seo,
            designScore: payload.scores.design,
            mobileScore: payload.scores.mobile,
            conversionScore: payload.scores.conversion,
            resultPayload: payload as object,
          },
        });

        await upsertSiteScanForAudit(auditId, payload);

        try {
          const { syncAnalysisProgressFromPayload, persistAnalysisPayload } = await import(
            "@/lib/audit/analysis-progress"
          );
          const { applyOpportunityReportToPayload } = await import(
            "@/lib/audit/audit-opportunity-from-payload"
          );
          const synced = syncAnalysisProgressFromPayload(payload);
          const withOpp = await applyOpportunityReportToPayload(synced, {
            name: audit.restaurantName,
            city: audit.city,
            websiteUrl: audit.websiteUrl,
          });
          await persistAnalysisPayload(auditId, withOpp);
        } catch (e) {
          console.warn("[audit/browserbase] analysis progress sync failed", e);
        }

        return { ok: true as const };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const failed = {
          ...prev,
          scanStatus: "failed" as const,
          browserbaseScan: {
            capturedAt: new Date().toISOString(),
            finalUrl: audit.websiteUrl ?? undefined,
            mode: "async-failed" as const,
            errorMessage: msg.slice(0, 500),
          },
        };
        await prisma.visibilityAudit.update({
          where: { id: auditId },
          data: { resultPayload: failed },
        });
        return { ok: false as const, error: msg };
      }
    });

    if (result.ok === true) {
      await step.run("enqueue-post-scan-ai", async () => {
        const sends: { name: string; data: Record<string, string> }[] = [];
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
          } catch (e) {
            console.warn("[audit/browserbase] Inngest send skipped", s.name, e);
          }
        }
        if (process.env.GEMINI_API_KEY?.trim() && !geminiEnqueued) {
          const { runAndPersistGeminiAuditSuite } = await import("@/lib/audit/persist-gemini-audit");
          await runAndPersistGeminiAuditSuite(auditId);
        } else if (process.env.GEMINI_API_KEY?.trim() && geminiEnqueued) {
          const { runAndPersistPerceptionStep } = await import("@/lib/audit/persist-gemini-audit");
          await runAndPersistPerceptionStep(auditId);
        }
        return sends.length;
      });
    } else {
      await step.run("finalize-stuck-pending", async () => finalizePendingAuditScan(auditId));
    }

    return { auditId, result };
  },
);

export const auditEnrichment = inngest.createFunction(
  {
    id: "audit-enrichment",
    name: "Audit · AI narrative",
    triggers: [{ event: "audit/enrichment.requested" }],
  },
  async ({ event, step }) => {
    const auditId = event.data.auditId;
    if (!auditId || typeof auditId !== "string") {
      throw new Error("audit/enrichment.requested missing auditId");
    }

    if (!isGeminiConfigured()) {
      return { auditId, skipped: true };
    }

    await step.run("openai-narrative", async () => {
      const audit = await prisma.visibilityAudit.findUnique({ where: { id: auditId } });
      if (!audit) return { ok: false as const };
      const payload = parseAuditPayload(audit.resultPayload);
      if (!payload) return { ok: false as const };

      const narrative = await enrichAuditNarrative(payload, {
        restaurantName: audit.restaurantName,
        city: audit.city,
      });
      if (!narrative) return { ok: true as const, unchanged: true };

      const next = { ...payload, aiNarrative: narrative };
      await prisma.visibilityAudit.update({
        where: { id: auditId },
        data: { resultPayload: next },
      });
      return { ok: true as const };
    });

    return { auditId };
  },
);

export const auditGeminiBenchmark = inngest.createFunction(
  {
    id: "audit-gemini-benchmark",
    name: "Audit · Gemini absolute benchmark",
    triggers: [{ event: "audit/gemini-benchmark.requested" }],
  },
  async ({ event, step }) => {
    const auditId = event.data.auditId;
    if (!auditId || typeof auditId !== "string") {
      throw new Error("audit/gemini-benchmark.requested missing auditId");
    }

    const {
      markAiJobsUnavailable,
      runAndPersistBenchmarkMediaStep,
      runAndPersistBenchmarkTextStep,
      runAndPersistPerceptionStep,
    } = await import("@/lib/audit/persist-gemini-audit");

    if (!process.env.GEMINI_API_KEY?.trim()) {
      await step.run("mark-no-gemini-key", () => markAiJobsUnavailable(auditId, "GEMINI_API_KEY is not configured"));
      return { auditId, skipped: true, reason: "no_gemini_key" };
    }

    // Perception first so Overview leaves “Analysing…” within ~30s
    await step.run("perception-first", () => runAndPersistPerceptionStep(auditId));
    await step.run("benchmark-text", () => runAndPersistBenchmarkTextStep(auditId));
    await step.run("benchmark-media", () => runAndPersistBenchmarkMediaStep(auditId));

    return { auditId };
  },
);

export const dailyDigestCron = inngest.createFunction(
  {
    id: "growth-daily-digest",
    name: "Growth · daily digest",
    triggers: [cron("15 13 * * *")],
  },
  async ({ step }) => {
    const restaurants = await step.run("list-restaurants", () =>
      prisma.restaurant.findMany({ select: { id: true } }),
    );

    for (const r of restaurants) {
      await step.run(`digest-${r.id}`, async () => saveDigestRun(r.id));
    }

    return { count: restaurants.length };
  },
);

/** Draft outbound leads when `OUTBOUND_SCAN_CITY` is set — human approval still required before any send. */
export const outboundDraftDaily = inngest.createFunction(
  {
    id: "outbound-draft-daily",
    name: "Outbound · draft daily",
    triggers: [cron("45 14 * * *"), { event: "outbound/daily.requested" }],
  },
  async ({ step }) => {
    if (isUkColdOutboundMode()) {
      return { skipped: true as const, reason: "OUTBOUND_MODE=uk_cold uses outboundUkColdDaily" };
    }

    const city = process.env.OUTBOUND_SCAN_CITY?.trim();
    if (!city) {
      return { skipped: true as const, reason: "OUTBOUND_SCAN_CITY not set" };
    }

    const workspaceId = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
    if (!workspaceId) {
      return { skipped: true as const, reason: "OUTBOUND_WORKSPACE_RESTAURANT_ID not set (required to persist leads per workspace)" };
    }

    const draft = await step.run("generate-outbound-draft", async () => {
      const result = await generateOutboundDraft({ city, max: 20 });
      if (!result.ok) {
        throw new Error(result.error);
      }
      return { leads: result.data.leads, source: result.source };
    });

    const inserted = await step.run("persist-outbound-leads", async () => {
      const rows = await persistOutboundDraftLeads(workspaceId, city, draft.leads);
      return rows.length;
    });

    await step.run("resend-outbound-summary", async () => {
      const key = process.env.RESEND_API_KEY?.trim();
      const to = process.env.OUTBOUND_RESEND_NOTIFY_EMAIL?.trim();
      if (!key || !to) {
        return { skipped: true as const, reason: "resend_or_notify_email_missing" };
      }
      const { Resend } = await import("resend");
      const resend = new Resend(key);
      const from =
        process.env.RESEND_FROM_EMAIL?.trim() ||
        "KOB Growth <onboarding@resend.dev>";
      const { error } = await resend.emails.send({
        from,
        to: [to],
        subject: `KOB outbound: ${String(inserted)} draft(s) · ${city}`,
        html: `<p>${String(inserted)} outbound lead draft(s) were created for <strong>${city}</strong>. Approve and send from the dashboard.</p>`,
      });
      if (error) {
        throw new Error(error.message);
      }
      return { sent: true as const };
    });

    return { city, inserted, source: draft.source };
  },
);

/** Sends Resend emails for human-approved leads with `contactEmail` set (batch + polite delay). */
export const outboundSendApprovedDaily = inngest.createFunction(
  {
    id: "outbound-send-approved",
    name: "Outbound · send approved",
    triggers: [cron("55 14 * * *"), { event: "outbound/send.requested" }],
  },
  async ({ step, event }) => {
    const key = process.env.RESEND_API_KEY?.trim();
    if (!key) {
      return { skipped: true as const, reason: "RESEND_API_KEY missing" };
    }

    const batch = Math.min(100, Math.max(1, Number(process.env.OUTBOUND_SEND_BATCH?.trim() || "30") || 30));
    const delaySec = Math.max(2, Number(process.env.OUTBOUND_SEND_DELAY_SEC?.trim() || "3") || 3);

    const leads = await step.run("list-approved-with-email", async () => {
      const fromEvent =
        event && typeof event === "object" && "data" in event
          ? (event as { data?: { restaurantId?: string } }).data?.restaurantId?.trim()
          : undefined;
      const workspaceId =
        fromEvent || process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim() || "";
      if (!workspaceId) {
        return [] as Awaited<ReturnType<typeof prisma.outboundLead.findMany>>;
      }
      const rows = await prisma.outboundLead.findMany({
        where: {
          workspaceRestaurantId: workspaceId,
          status: OutboundLeadStatus.APPROVED,
          contactEmail: { not: null },
          messageBody: { not: null },
        },
        take: batch * 2,
        orderBy: { createdAt: "asc" },
      });
      const withEmail = rows.filter((r) => r.contactEmail?.trim());
      return withEmail.slice(0, batch);
    });

    if (!leads.length) {
      return { sent: 0 as const, message: "no_eligible_leads" as const };
    }

    let sent = 0;
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i]!;
      await step.run(`resend-${lead.id}`, async () => {
        const to = lead.contactEmail!.trim();
        const subject = lead.messageSubject?.trim() || "A note from KOB";
        const result = await sendOutboundEmailViaResend(key, {
          to,
          subject,
          body: lead.messageBody || "",
          tags: lead.emailVariant
            ? [
                { name: "variant", value: lead.emailVariant },
                { name: "outbound", value: "1" },
              ]
            : [{ name: "outbound", value: "1" }],
        });
        if (!result.ok) {
          throw new Error(result.error);
        }
        await prisma.outboundLead.update({
          where: { id: lead.id },
          data: { status: OutboundLeadStatus.SENT },
        });
        return { ok: true as const };
      });
      sent++;
      if (i < leads.length - 1) {
        await step.sleep(`outbound-delay-${i}`, `${delaySec}s`);
      }
    }

    return { sent, processed: leads.length };
  },
);

/** UK cold: Places ICP → qualify → Hunter email → draft → queue for batch approval. */
export const outboundUkColdDaily = inngest.createFunction(
  {
    id: "outbound-uk-cold-daily",
    name: "Outbound · UK cold daily",
    triggers: [cron("45 14 * * *"), { event: "outbound/uk-cold.requested" }],
  },
  async ({ step }) => {
    const workspaceId = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
    if (!workspaceId) {
      return { skipped: true as const, reason: "OUTBOUND_WORKSPACE_RESTAURANT_ID not set" };
    }

    const result = await step.run("uk-cold-pipeline", () => runUkColdPipeline(workspaceId));

    await step.run("resend-uk-cold-summary", async () => {
      const key = process.env.RESEND_API_KEY?.trim();
      const to = process.env.OUTBOUND_RESEND_NOTIFY_EMAIL?.trim();
      if (!key || !to) {
        return { skipped: true as const, reason: "resend_or_notify_email_missing" };
      }
      const { Resend } = await import("resend");
      const resend = new Resend(key);
      const from =
        process.env.RESEND_FROM_EMAIL?.trim() ||
        "KOB Growth <onboarding@resend.dev>";
      const skipLines = Object.entries(result.skipped)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      const { error } = await resend.emails.send({
        from,
        to: [to],
        subject: `KOB UK cold: ${result.inserted} lead(s) ready · ${result.city}`,
        html: `<p><strong>${result.inserted}</strong> UK cold lead(s) for <strong>${result.city}</strong> are in the approval queue.</p>
<p>Discovered ${result.discovered}, qualified ${result.qualified}, enriched ${result.enriched}.</p>
${skipLines ? `<p>Skipped: ${skipLines}</p>` : ""}
<p>Approve the batch in the dashboard, then the send job runs.</p>`,
      });
      if (error) throw new Error(error.message);
      return { sent: true as const };
    });

    return result;
  },
);

/** Import yesterday's audit unlocks into the audit follow-up track. */
export const outboundAuditImportDaily = inngest.createFunction(
  {
    id: "outbound-audit-import-daily",
    name: "Outbound · audit import daily",
    triggers: [cron("40 14 * * *"), { event: "outbound/audit-import.requested" }],
  },
  async ({ step }) => {
    const workspaceId = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
    if (!workspaceId) {
      return { skipped: true as const, reason: "OUTBOUND_WORKSPACE_RESTAURANT_ID not set" };
    }

    return step.run("import-audit-leads", () =>
      importAuditLeadsToOutbound(workspaceId, { max: 30, daysBack: 2 }),
    );
  },
);

/** Agent A — discover UK/IE independents with email into LeadProspect pool. */
export const leadFinderDaily = inngest.createFunction(
  {
    id: "lead-finder-daily",
    name: "Lead engine · finder daily",
    triggers: [cron("0 6 * * *"), { event: "lead-engine/finder.requested" }],
  },
  async ({ step }) => {
    const workspaceId = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
    if (!workspaceId) {
      return { skipped: true as const, reason: "OUTBOUND_WORKSPACE_RESTAURANT_ID not set" };
    }

    const result = await step.run("lead-finder", () => runLeadFinder(workspaceId));

    await step.run("resend-lead-finder-summary", async () => {
      const key = process.env.RESEND_API_KEY?.trim();
      const to = process.env.OUTBOUND_RESEND_NOTIFY_EMAIL?.trim();
      if (!key || !to) return { skipped: true as const, reason: "resend_or_notify_email_missing" };
      const { Resend } = await import("resend");
      const resend = new Resend(key);
      const from =
        process.env.RESEND_FROM_EMAIL?.trim() || "KOB Growth <onboarding@resend.dev>";
      const skipLines = Object.entries(result.skipped)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      const { error } = await resend.emails.send({
        from,
        to: [to],
        subject: `KOB Lead Finder: ${result.inserted} new · ${result.city}`,
        html: `<p><strong>${result.inserted}</strong> prospect(s) added for <strong>${result.city}</strong> (${result.country}).</p>
<p>Contactable total: <strong>${result.contactableTotal}</strong>. Analyzed queue runs next.</p>
${skipLines ? `<p>Skipped: ${skipLines}</p>` : ""}`,
      });
      if (error) throw new Error(error.message);
      return { sent: true as const };
    });

    return result;
  },
);

/** Agent B — score DISCOVERED prospects with KOB Opportunity Score. */
export const leadAnalyzerDaily = inngest.createFunction(
  {
    id: "lead-analyzer-daily",
    name: "Lead engine · analyzer daily",
    triggers: [cron("15 6 * * *"), { event: "lead-engine/analyzer.requested" }],
  },
  async ({ step }) => {
    const workspaceId = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
    if (!workspaceId) {
      return { skipped: true as const, reason: "OUTBOUND_WORKSPACE_RESTAURANT_ID not set" };
    }

    return step.run("lead-analyzer", () => runOpportunityAnalyzer(workspaceId));
  },
);

/** Agent C — draft personalized outreach for high-score ANALYZED prospects. */
export const leadOutreachWriterDaily = inngest.createFunction(
  {
    id: "lead-outreach-writer-daily",
    name: "Lead engine · outreach writer daily",
    triggers: [cron("30 6 * * *"), { event: "lead-engine/outreach-writer.requested" }],
  },
  async ({ step }) => {
    const workspaceId = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
    if (!workspaceId) {
      return { skipped: true as const, reason: "OUTBOUND_WORKSPACE_RESTAURANT_ID not set" };
    }

    const result = await step.run("lead-outreach-writer", () => runOutreachWriter(workspaceId));

    await step.run("resend-lead-outreach-summary", async () => {
      const key = process.env.RESEND_API_KEY?.trim();
      const to = process.env.OUTBOUND_RESEND_NOTIFY_EMAIL?.trim();
      if (!key || !to || result.queued === 0) {
        return { skipped: true as const };
      }
      const { Resend } = await import("resend");
      const resend = new Resend(key);
      const from =
        process.env.RESEND_FROM_EMAIL?.trim() || "KOB Growth <onboarding@resend.dev>";
      const { error } = await resend.emails.send({
        from,
        to: [to],
        subject: `KOB Outreach Writer: ${result.queued} email(s) ready`,
        html: `<p><strong>${result.queued}</strong> personalized email(s) are in the approval queue.</p>
<p>Open <strong>/dashboard/outbound</strong> → Lead Engine or UK cold tab to approve.</p>`,
      });
      if (error) throw new Error(error.message);
      return { sent: true as const };
    });

    return result;
  },
);

/** Daily sync for connected POS and analytics integrations. */
export const integrationSyncDaily = inngest.createFunction(
  {
    id: "integration-sync-daily",
    name: "Integrations · daily sync",
    triggers: [cron("30 6 * * *")],
  },
  async ({ step }) => {
    const integrations = await step.run("list-integrations", () =>
      prisma.integration.findMany({
        where: {
          provider: { in: ["SQUARE", "TOAST", "GOOGLE_ANALYTICS", "GOOGLE_SEARCH_CONSOLE", "GOOGLE_CALENDAR", "GMAIL"] },
        },
      }),
    );

    let synced = 0;
    for (const row of integrations) {
      await step.run(`sync-${row.id}`, async () => {
        const integration = await prisma.integration.findUnique({ where: { id: row.id } });
        if (!integration) return 0;
        if (integration.provider === "SQUARE") {
          const { syncSquareSales } = await import("@/lib/integrations/providers/square");
          return syncSquareSales(integration.restaurantId, integration);
        }
        if (integration.provider === "TOAST") {
          const { syncToastSales } = await import("@/lib/integrations/providers/toast");
          return syncToastSales(integration.restaurantId, integration);
        }
        if (integration.provider === "GOOGLE_ANALYTICS") {
          const { syncGa4Traffic } = await import("@/lib/integrations/providers/ga4");
          return syncGa4Traffic(integration.restaurantId, integration);
        }
        if (integration.provider === "GOOGLE_SEARCH_CONSOLE") {
          const { syncGscKeywords } = await import("@/lib/integrations/providers/gsc");
          return syncGscKeywords(integration.restaurantId, integration);
        }
        if (integration.provider === "GOOGLE_CALENDAR") {
          const { syncGoogleCalendarEvents } = await import("@/lib/integrations/providers/google-calendar");
          return syncGoogleCalendarEvents(integration.restaurantId, integration);
        }
        if (integration.provider === "GMAIL") {
          const { syncGmailSnapshot } = await import("@/lib/integrations/providers/gmail");
          return syncGmailSnapshot(integration.restaurantId, integration);
        }
        return 0;
      });
      synced++;
    }
    return { synced };
  },
);

export const cosGenerateDraftsOnApprove = inngest.createFunction(
  {
    id: "cos-generate-drafts-on-approve",
    name: "Chief of Staff · generate drafts after approve",
    triggers: [{ event: "chief-of-staff/task.approved" }],
  },
  async ({ event, step }) => {
    const taskId = event.data.taskId as string;
    return step.run("generate-drafts", async () => {
      const { generateDraftsForTask } = await import("@/lib/chief-of-staff/generate-drafts-for-task");
      return generateDraftsForTask(taskId);
    });
  },
);

export const creativeAgentPackRequested = inngest.createFunction(
  {
    id: "creative-agent-pack",
    name: "Creative Agent · generate pack",
    triggers: [{ event: "creative-agent/pack.requested" }],
  },
  async ({ event, step }) => {
    const packId = event.data.packId as string;
    const restaurantId = event.data.restaurantId as string;
    const preview = Boolean(event.data.preview);
    const dishHints = Array.isArray(event.data.dishHints)
      ? (event.data.dishHints as string[])
      : [];

    return step.run("run-creative-pack", async () => {
      const { runCreativePack } = await import("@/lib/creative-agent/run-creative-pack");
      return runCreativePack(restaurantId, { packId, preview, dishHints });
    });
  },
);

export const functions = [
  ingestionHourly,
  normalizationRequested,
  insightDetection,
  aiRecommendations,
  auditRunPipeline,
  auditBrowserbaseScan,
  auditEnrichment,
  auditGeminiBenchmark,
  dailyDigestCron,
  outboundDraftDaily,
  outboundSendApprovedDaily,
  outboundUkColdDaily,
  outboundAuditImportDaily,
  leadFinderDaily,
  leadAnalyzerDaily,
  leadOutreachWriterDaily,
  integrationSyncDaily,
  cosGenerateDraftsOnApprove,
  creativeAgentPackRequested,
];
