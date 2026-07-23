import Browserbase from "@browserbasehq/sdk";
import {
  hostFromAuditUrl,
  mergeNetworkFacts,
  previewResponseBody,
  shouldCaptureNetworkUrl,
  type AuditNetworkFact,
} from "@/lib/audit/network-capture";
import { analyzeScreenshotBuffer } from "@/lib/audit/visual-intelligence";
import type { BrowserbaseRenderedPage } from "@/lib/browserbase/types";
import { maybeUploadAuditScreenshotPng } from "@/lib/supabase/audit-screenshot";

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

import { isBrowserbaseConfigured } from "@/lib/browserbase/browserbase-config";

export { isBrowserbaseConfigured };

function normalizeUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

/**
 * Render URL in Browserbase via Playwright CDP — JS-heavy / Owner.com style sites.
 * Caller must catch errors; always attempts browser disconnect.
 * Playwright is loaded lazily so Inngest /api/inngest can boot on Netlify without playwright-core.
 */
export async function fetchRenderedPage(url: string): Promise<BrowserbaseRenderedPage> {
  const apiKey = process.env.BROWSERBASE_API_KEY?.trim();
  const projectId = process.env.BROWSERBASE_PROJECT_ID?.trim();
  if (!apiKey || !projectId) {
    throw new Error("browserbase_not_configured");
  }

  const { chromium } = await import("playwright-core");

  const target = normalizeUrl(url);
  try {
    // eslint-disable-next-line no-new -- URL validates
    new URL(target);
  } catch {
    throw new Error("invalid_url");
  }

  const proxies = process.env.AUDIT_BROWSERBASE_PROXY === "1";

  const client = new Browserbase({ apiKey });
  const session = await client.sessions.create({
    projectId,
    timeout: 120,
    proxies,
    browserSettings: {
      advancedStealth: true,
      blockAds: true,
      viewport: { width: 1280, height: 720 },
    },
    userMetadata: {
      source: "kob-visibility-audit",
    },
  });

  const browser = await chromium.connectOverCDP(session.connectUrl);
  try {
    const ctx = browser.contexts()[0];
    if (!ctx) throw new Error("browserbase_no_context");
    const page = ctx.pages()[0] ?? (await ctx.newPage());
    const allowedHost = hostFromAuditUrl(target);
    const networkFacts: AuditNetworkFact[] = [];

    page.on("response", async (response) => {
      try {
        const req = response.request();
        const url = req.url();
        if (!allowedHost || !shouldCaptureNetworkUrl(url, allowedHost)) return;
        const u = new URL(url);
        const ct = response.headers()["content-type"] ?? null;
        const entry = {
          method: req.method(),
          path: u.pathname + u.search,
          status: response.status(),
          contentType: ct,
        };
        if (ct?.includes("json") || ct?.includes("text")) {
          const body = await response.text().catch(() => "");
          networkFacts.push({
            ...entry,
            responsePreview: previewResponseBody(body, ct),
          });
        } else if (networkFacts.length < 24) {
          networkFacts.push({ ...entry, responsePreview: null });
        }
      } catch {
        /* ignore per-response errors */
      }
    });

    const resp = await page.goto(target, { waitUntil: "domcontentloaded", timeout: 55_000 });
    const statusCode = resp?.status() ?? null;
    await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 12_000 }).catch(() => {});
    await page.evaluate(() => {
      window.scrollTo(0, Math.min(900, document.body?.scrollHeight ?? 900));
    });
    await page.evaluate(() => new Promise<void>((r) => setTimeout(r, 2500)));

    let visualMetrics = undefined as BrowserbaseRenderedPage["visualMetrics"];
    let screenshotPublicUrl: string | undefined;
    if (process.env.AUDIT_VISUAL_METRICS !== "0") {
      try {
        const shot = await page.screenshot({ type: "png", fullPage: false });
        const buf = Buffer.isBuffer(shot) ? shot : Buffer.from(shot);
        visualMetrics = await analyzeScreenshotBuffer(buf);
        screenshotPublicUrl = (await maybeUploadAuditScreenshotPng(buf, `bb-${session.id}`)) ?? undefined;
      } catch (e) {
        console.warn("[browserbase] visual metrics skipped", e);
      }
    }

    const html = await page.content();
    const finalUrl = page.url();

    return {
      html,
      finalUrl,
      sessionId: session.id,
      statusCode,
      visualMetrics,
      screenshotPublicUrl,
      networkFacts: mergeNetworkFacts(networkFacts),
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

export async function fetchRenderedPageWithRetry(url: string, maxAttempts = 2): Promise<BrowserbaseRenderedPage> {
  let last: unknown;
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      return await fetchRenderedPage(url);
    } catch (e) {
      last = e;
      if (i < maxAttempts) await sleep(800 * i);
    }
  }
  throw last instanceof Error ? last : new Error("browserbase_failed");
}
