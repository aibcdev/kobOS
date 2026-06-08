import { analyzeWebsiteFromHtml, analyzeWebsiteFull, type WebsiteAnalysis } from "@/lib/audit/analyze-url";
import { computeEngagementSignals } from "@/lib/audit/engagement-signals";
import type { AuditBrowserbaseScan } from "@/lib/audit/types";
import type { AuditVisualIntelligenceResult } from "@/lib/audit/visual-intelligence";
import type { AuditStagehandExtraction } from "@/lib/browserbase/stagehand-schema";
import { getAuditBrowserbaseMode, shouldSyncBrowserbaseRender } from "@/lib/audit/browserbase-policy";
import { isAuditBrowserbaseEnabled } from "@/lib/audit/is-audit-browserbase-enabled";
import { fetchRenderedPageWithRetry } from "@/lib/browserbase/fetch-page";
import {
  fetchRenderedPageViaStagehandWithRetry,
  isStagehandAuditEnabled,
} from "@/lib/browserbase/stagehand-scan";

function utcNow() {
  return new Date().toISOString();
}

/** Cheap visible-text preview for audit payloads (not Markdown). */
export function auditPageTextPreview(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);
}

function normalizeWebsiteUrl(raw: string): string {
  const t = raw.trim();
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

export type AuditWebsitePipelineResult = {
  analysis: WebsiteAnalysis;
  /** When true, POST /api/audit/run should queue `audit/browserbase.requested` after insert. */
  queueAsyncBrowserbase: boolean;
  /** Merged into `AuditResultPayload.browserbaseScan` when set. */
  browserbaseScan?: AuditBrowserbaseScan;
  visualMetrics?: AuditVisualIntelligenceResult;
  stagehandExtraction?: AuditStagehandExtraction;
  networkFacts?: import("@/lib/audit/network-capture").AuditNetworkFact[];
};

export async function runAuditWebsitePipeline(
  websiteUrl: string | undefined,
  meta?: { restaurantName: string; city: string },
  options?: {
    /** When set, skip the first `analyzeWebsiteFull` (e.g. multi-site merged signals). */
    precomputedAnalysis?: WebsiteAnalysis;
    /** When true, never run Browserbase / Stagehand (multi-site roll-up uses fetch-only merge). */
    skipBrowserbase?: boolean;
  },
): Promise<AuditWebsitePipelineResult> {
  const bbEnabled = !options?.skipBrowserbase && isAuditBrowserbaseEnabled();
  const bbAsync = process.env.AUDIT_BROWSERBASE_ASYNC === "1";
  const bbAlways = getAuditBrowserbaseMode() === "always";

  if (!websiteUrl?.trim()) {
    const analysis = options?.precomputedAnalysis ?? (await analyzeWebsiteFull(websiteUrl));
    return {
      analysis,
      queueAsyncBrowserbase: false,
    };
  }

  const fetchAnalysis =
    options?.precomputedAnalysis ?? (await analyzeWebsiteFull(websiteUrl));

  if (!bbEnabled) {
    return { analysis: fetchAnalysis, queueAsyncBrowserbase: false };
  }

  const needsSyncBb =
    bbAlways ||
    shouldSyncBrowserbaseRender(fetchAnalysis.signals);

  if (bbAsync) {
    return {
      analysis: fetchAnalysis,
      queueAsyncBrowserbase: true,
      browserbaseScan: {
        capturedAt: utcNow(),
        finalUrl: normalizeWebsiteUrl(websiteUrl),
        mode: "async-pending",
      },
    };
  }

  if (!needsSyncBb) {
    return { analysis: fetchAnalysis, queueAsyncBrowserbase: false };
  }

  if (isStagehandAuditEnabled() && meta) {
    try {
      const page = await fetchRenderedPageViaStagehandWithRetry(websiteUrl.trim(), meta, 2);
      const rendered = analyzeWebsiteFromHtml(page.html, page.finalUrl, {
        httpStatus: page.statusCode ?? undefined,
      });
      rendered.engagementSignals = computeEngagementSignals(
        page.html,
        rendered.signals,
        page.stagehandExtraction,
      );
      return {
        analysis: rendered,
        queueAsyncBrowserbase: false,
        browserbaseScan: {
          sessionId: page.sessionId,
          capturedAt: utcNow(),
          finalUrl: page.finalUrl,
          mode: "sync",
          approximateMarkdownSnippet: auditPageTextPreview(page.html),
          screenshotPublicUrl: page.screenshotPublicUrl,
        },
        visualMetrics: page.visualMetrics,
        stagehandExtraction: page.stagehandExtraction,
        networkFacts: page.networkFacts,
      };
    } catch (e) {
      console.warn("[audit] Stagehand scan failed; falling back to Playwright", e);
    }
  }

  try {
    const page = await fetchRenderedPageWithRetry(websiteUrl.trim(), 2);
    const rendered = analyzeWebsiteFromHtml(page.html, page.finalUrl, {
      httpStatus: page.statusCode ?? undefined,
    });
    return {
      analysis: rendered,
      queueAsyncBrowserbase: false,
      browserbaseScan: {
        sessionId: page.sessionId,
        capturedAt: utcNow(),
        finalUrl: page.finalUrl,
        mode: "sync",
        approximateMarkdownSnippet: auditPageTextPreview(page.html),
        screenshotPublicUrl: page.screenshotPublicUrl,
      },
      visualMetrics: page.visualMetrics,
      networkFacts: page.networkFacts,
    };
  } catch (e) {
    console.warn("[audit] Browserbase sync scan failed", e);
    return { analysis: fetchAnalysis, queueAsyncBrowserbase: false };
  }
}
