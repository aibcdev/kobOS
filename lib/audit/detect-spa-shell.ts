import type { UrlSignals } from "@/lib/audit/analyze-url";

/**
 * True when a plain HTTP fetch likely returned a JS app shell, not rendered content.
 * Owner.com-style sites need Browserbase before rubric scoring.
 */
export function isLikelySpaShell(signals: UrlSignals, htmlSample?: string): boolean {
  if (!signals.fetched) return false;

  const thinShell =
    signals.htmlSizeKb < 80 && signals.imgCount < 2;

  const missingSemantics =
    signals.h1Count === 0 &&
    !signals.hasJsonLd &&
    !signals.hasMetaDescription &&
    signals.htmlSizeKb > 20;

  const largeButEmpty =
    signals.htmlSizeKb >= 80 &&
    signals.h1Count === 0 &&
    !signals.hasJsonLd &&
    signals.imgCount < 3;

  if (thinShell || missingSemantics || largeButEmpty) return true;

  if (!htmlSample) return false;

  const lower = htmlSample.slice(0, 12_000).toLowerCase();
  const spaMarkers =
    /id=["']__next["']|id=["']root["']|data-reactroot|ng-version=|__nuxt|gatsby-focus-wrapper|webpackJsonp|vite\/client/.test(
      lower,
    );
  const lowTextDensity =
    signals.htmlSizeKb > 40 &&
    signals.h1Count === 0 &&
    !signals.hasMetaDescription;

  return spaMarkers && lowTextDensity;
}
