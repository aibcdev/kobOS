export type PageSpeedInsightsSnapshot = {
  fetchedAt: string;
  performanceScore: number | null;
  lcpMs: number | null;
  cls: number | null;
  error?: string;
};

function parseApiKey(): string | null {
  return (
    process.env.PAGESPEED_API_KEY?.trim() ||
    process.env.GOOGLE_PAGESPEED_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    null
  );
}

/** Factual mobile performance from Google PageSpeed Insights API v5. */
export async function fetchPageSpeedInsights(url: string): Promise<PageSpeedInsightsSnapshot> {
  const apiKey = parseApiKey();
  const fetchedAt = new Date().toISOString();
  if (!apiKey) {
    return { fetchedAt, performanceScore: null, lcpMs: null, cls: null, error: "no_pagespeed_key" };
  }

  const target = url.startsWith("http") ? url : `https://${url}`;
  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", target);
  endpoint.searchParams.set("strategy", "mobile");
  endpoint.searchParams.set("category", "performance");
  endpoint.searchParams.set("key", apiKey);

  try {
    const res = await fetch(endpoint.toString(), { signal: AbortSignal.timeout(45_000) });
    if (!res.ok) {
      return {
        fetchedAt,
        performanceScore: null,
        lcpMs: null,
        cls: null,
        error: `psi_http_${res.status}`,
      };
    }
    const data = (await res.json()) as {
      lighthouseResult?: {
        categories?: { performance?: { score?: number } };
        audits?: Record<string, { numericValue?: number }>;
      };
    };
    const lr = data.lighthouseResult;
    const perfRaw = lr?.categories?.performance?.score;
    const performanceScore =
      typeof perfRaw === "number" ? Math.round(Math.min(1, Math.max(0, perfRaw)) * 100) : null;
    const lcpMs = lr?.audits?.["largest-contentful-paint"]?.numericValue ?? null;
    const cls = lr?.audits?.["cumulative-layout-shift"]?.numericValue ?? null;
    return {
      fetchedAt,
      performanceScore,
      lcpMs: typeof lcpMs === "number" ? Math.round(lcpMs) : null,
      cls: typeof cls === "number" ? Math.round(cls * 1000) / 1000 : null,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "psi_failed";
    return { fetchedAt, performanceScore: null, lcpMs: null, cls: null, error: msg.slice(0, 200) };
  }
}
