import { Stagehand } from "@browserbasehq/stagehand";
import { analyzeScreenshotBuffer } from "@/lib/audit/visual-intelligence";
import { maybeUploadAuditScreenshotPng } from "@/lib/supabase/audit-screenshot";
import type { BrowserbaseRenderedPage } from "@/lib/browserbase/types";
import {
  AUDIT_STAGEHAND_INSTRUCTION,
  type AuditStagehandExtraction,
  auditStagehandExtractionSchema,
} from "@/lib/browserbase/stagehand-schema";

function normalizeUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

export type StagehandRenderedPage = BrowserbaseRenderedPage & {
  stagehandExtraction: AuditStagehandExtraction;
};

export function isStagehandAuditEnabled(): boolean {
  if (process.env.AUDIT_STAGEHAND === "0") return false;
  const hasBrowserbase = Boolean(process.env.BROWSERBASE_API_KEY?.trim());
  const hasLlm = Boolean(
    process.env.OPENAI_API_KEY?.trim() ||
      process.env.ANTHROPIC_API_KEY?.trim() ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
      process.env.GEMINI_API_KEY?.trim(),
  );
  if (!hasBrowserbase || !hasLlm) return false;
  if (process.env.AUDIT_STAGEHAND === "1") return true;
  return hasBrowserbase;
}

/**
 * Single Browserbase session: Stagehand navigation + LLM extract + viewport screenshot metrics.
 */
export async function fetchRenderedPageViaStagehand(
  url: string,
  context: { restaurantName: string; city: string },
): Promise<StagehandRenderedPage> {
  const apiKey = process.env.BROWSERBASE_API_KEY?.trim();
  if (!apiKey) throw new Error("browserbase_not_configured");

  const model = process.env.AUDIT_STAGEHAND_MODEL?.trim() || "openai/gpt-4o-mini";
  const projectId = process.env.BROWSERBASE_PROJECT_ID?.trim();

  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    apiKey,
    ...(projectId ? { projectId } : {}),
    model,
    verbose: 0,
  });

  await stagehand.init();
  try {
    const page = stagehand.context.pages()[0];
    if (!page) throw new Error("stagehand_no_page");

    const target = normalizeUrl(url);
    const resp = await page.goto(target, { waitUntil: "domcontentloaded", timeoutMs: 45_000 });
    const statusCode = resp?.status() ?? null;
    await page.waitForLoadState("networkidle", 8000).catch(() => {});
    await page.evaluate(() => new Promise<void>((r) => setTimeout(r, 1500)));

    const raw = await stagehand.extract(
      `${AUDIT_STAGEHAND_INSTRUCTION}\nContext: ${JSON.stringify(context)}`,
      auditStagehandExtractionSchema,
    );
    const extraction = auditStagehandExtractionSchema.parse(raw);

    let visualMetrics = undefined as BrowserbaseRenderedPage["visualMetrics"];
    let screenshotPublicUrl: string | undefined;
    if (process.env.AUDIT_VISUAL_METRICS !== "0") {
      try {
        const shot = await page.screenshot({ type: "png", fullPage: false });
        const buf = Buffer.isBuffer(shot) ? shot : Buffer.from(shot);
        visualMetrics = await analyzeScreenshotBuffer(buf);
        const sid = stagehand.browserbaseSessionID ?? "session";
        screenshotPublicUrl = (await maybeUploadAuditScreenshotPng(buf, `sh-${sid}`)) ?? undefined;
      } catch (e) {
        console.warn("[stagehand] screenshot metrics skipped", e);
      }
    }

    const html = await page.evaluate(
      () => `<!DOCTYPE html>\n${document.documentElement.outerHTML}`,
    );
    const finalUrl = page.url();
    const sessionId = stagehand.browserbaseSessionID ?? "";

    return {
      html,
      finalUrl,
      sessionId,
      statusCode,
      visualMetrics,
      screenshotPublicUrl,
      stagehandExtraction: extraction,
    };
  } finally {
    await stagehand.close().catch(() => {});
  }
}

function sleepStagehand(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export async function fetchRenderedPageViaStagehandWithRetry(
  url: string,
  context: { restaurantName: string; city: string },
  maxAttempts = 2,
): Promise<StagehandRenderedPage> {
  let last: unknown;
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      return await fetchRenderedPageViaStagehand(url, context);
    } catch (e) {
      last = e;
      if (i < maxAttempts) await sleepStagehand(800 * i);
    }
  }
  throw last instanceof Error ? last : new Error("stagehand_failed");
}
