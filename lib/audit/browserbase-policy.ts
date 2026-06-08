import { isBrowserbaseConfigured } from "@/lib/browserbase/fetch-page";
import type { UrlSignals } from "@/lib/audit/analyze-url";
import { isLikelySpaShell } from "@/lib/audit/detect-spa-shell";

export type AuditBrowserbaseMode = "always" | "fallback";

/** Default: always render in cloud browser when keys exist (Owner.com-grade evidence). */
export function getAuditBrowserbaseMode(): AuditBrowserbaseMode {
  const raw = process.env.AUDIT_BROWSERBASE_MODE?.trim().toLowerCase();
  if (raw === "fallback") return "fallback";
  if (raw === "always") return "always";
  return isBrowserbaseConfigured() ? "always" : "fallback";
}

export function shouldSyncBrowserbaseRender(
  fetchSignals: UrlSignals,
  htmlSample?: string,
): boolean {
  if (getAuditBrowserbaseMode() === "always") return true;
  if (!fetchSignals.fetched) return true;
  if (fetchSignals.status != null && fetchSignals.status >= 400) return true;
  if (isLikelySpaShell(fetchSignals, htmlSample)) return true;
  const thinShell = fetchSignals.htmlSizeKb < 80 && fetchSignals.imgCount < 2;
  if (thinShell) return true;
  const weakSeoShell =
    fetchSignals.fetched &&
    !fetchSignals.hasMetaDescription &&
    fetchSignals.h1Count === 0 &&
    !fetchSignals.hasViewport;
  return weakSeoShell;
}
