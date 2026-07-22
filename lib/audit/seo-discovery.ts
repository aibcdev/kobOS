/**
 * Fetch robots.txt + sitemap for technical SEO crawlability signals.
 * Used when identifying a restaurant website during the public audit.
 */

export type SeoCrawlDiscovery = {
  robotsTxtFound: boolean;
  /** True when robots.txt has a Disallow: / that blocks all crawlers. */
  robotsDisallowsAll: boolean;
  sitemapFound: boolean;
  /** Approximate URL count from sitemap (null if unknown / index-only). */
  sitemapUrlCount: number | null;
};

const DISCOVERY_TIMEOUT_MS = 6_000;
const USER_AGENT = "KOB-VisibilityAudit/1.0 (+https://trykob.com)";

async function fetchText(url: string): Promise<{ ok: boolean; text: string; finalUrl: string } | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/plain,application/xml,text/xml,*/*",
      },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const text = await res.text();
    if (!text || text.length > 2_000_000) return { ok: true, text: text.slice(0, 500_000), finalUrl: res.url };
    return { ok: true, text, finalUrl: res.url };
  } catch {
    clearTimeout(t);
    return null;
  }
}

function originFromPageUrl(pageUrl: string): string | null {
  try {
    const u = new URL(pageUrl.startsWith("http") ? pageUrl : `https://${pageUrl}`);
    return u.origin;
  } catch {
    return null;
  }
}

function parseSitemapLocsFromRobots(robotsBody: string): string[] {
  const locs: string[] = [];
  for (const line of robotsBody.split(/\r?\n/)) {
    const m = line.match(/^\s*sitemap:\s*(\S+)/i);
    if (m?.[1]) locs.push(m[1].trim());
  }
  return locs;
}

function robotsBlocksAll(robotsBody: string): boolean {
  // Simple heuristic: User-agent: * followed by Disallow: / with no Allow override nearby.
  const blocks = /user-agent:\s*\*[\s\S]{0,400}?disallow:\s*\/\s*(?:$|\n)/i.test(robotsBody);
  const allowsRoot = /user-agent:\s*\*[\s\S]{0,400}?allow:\s*\/\s*(?:$|\n)/i.test(robotsBody);
  return blocks && !allowsRoot;
}

function countSitemapUrls(xml: string): number | null {
  const locs = xml.match(/<loc\b[^>]*>/gi);
  if (!locs?.length) return null;
  // Sitemap index vs urlset — still useful as a presence signal.
  return locs.length;
}

async function probeSitemap(url: string): Promise<{ found: boolean; count: number | null }> {
  const res = await fetchText(url);
  if (!res?.ok) return { found: false, count: null };
  const looksXml = /<\?xml|<urlset|<sitemapindex/i.test(res.text);
  if (!looksXml && !/<loc[\s>]/i.test(res.text)) return { found: false, count: null };
  return { found: true, count: countSitemapUrls(res.text) };
}

/** Probe origin robots.txt and common sitemap paths (plus Sitemap: from robots). */
export async function discoverSeoCrawlAssets(pageUrl: string): Promise<SeoCrawlDiscovery> {
  const origin = originFromPageUrl(pageUrl);
  if (!origin) {
    return {
      robotsTxtFound: false,
      robotsDisallowsAll: false,
      sitemapFound: false,
      sitemapUrlCount: null,
    };
  }

  const robots = await fetchText(`${origin}/robots.txt`);
  let robotsTxtFound = false;
  let robotsDisallowsAll = false;
  const sitemapCandidates: string[] = [];

  if (robots?.ok) {
    const body = robots.text;
    // Soft 404 HTML pages sometimes returned as 200 — require robots-ish content.
    const looksLikeRobots =
      /user-agent:/i.test(body) || /sitemap:/i.test(body) || /disallow:/i.test(body);
    if (looksLikeRobots && !/<html[\s>]/i.test(body)) {
      robotsTxtFound = true;
      robotsDisallowsAll = robotsBlocksAll(body);
      sitemapCandidates.push(...parseSitemapLocsFromRobots(body));
    }
  }

  sitemapCandidates.push(`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`);

  let sitemapFound = false;
  let sitemapUrlCount: number | null = null;
  const seen = new Set<string>();

  for (const cand of sitemapCandidates) {
    const key = cand.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const probe = await probeSitemap(cand);
    if (probe.found) {
      sitemapFound = true;
      sitemapUrlCount = probe.count;
      break;
    }
  }

  return {
    robotsTxtFound,
    robotsDisallowsAll,
    sitemapFound,
    sitemapUrlCount,
  };
}
