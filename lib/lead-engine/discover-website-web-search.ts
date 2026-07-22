import { scoreWebsiteHtmlMatch } from "@/lib/lead-engine/guess-website-url";

const BLOCKED_HOSTS =
  /just-eat|justeat|deliveroo|ubereats|facebook|instagram|twitter|tripadvisor|google\.|yelp\.|tiktok\.|wikipedia\.org/i;

const SEARCH_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function extractResultUrls(html: string): string[] {
  const urls: string[] = [];
  const re = /uddg=([^&"']+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const href = decodeURIComponent(m[1]!);
      const u = new URL(href);
      if (BLOCKED_HOSTS.test(u.hostname)) continue;
      urls.push(u.origin);
    } catch {
      continue;
    }
  }
  return [...new Set(urls)].slice(0, 6);
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": SEARCH_UA, Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Free web search fallback when Google Places API is unavailable.
 * Off by default — set LEAD_ENGINE_WEB_SEARCH=1 to enable DuckDuckGo lookup.
 */
export async function discoverWebsiteViaWebSearch(
  name: string,
  city: string,
): Promise<string | null> {
  if (process.env.LEAD_ENGINE_WEB_SEARCH?.trim() !== "1") return null;
  const query = `${name} ${city} restaurant website`;
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(searchUrl, {
      headers: { "User-Agent": SEARCH_UA, Accept: "text/html" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;

    const html = await res.text();
    const candidates = extractResultUrls(html);
    if (!candidates.length) return null;

    let best: { url: string; score: number } | null = null;

    for (const url of candidates) {
      const page = await fetchPage(url);
      if (!page) continue;
      const score = scoreWebsiteHtmlMatch(name, city, page, url);
      if (score < 25) continue;
      if (!best || score > best.score) best = { url, score };
    }

    return best?.url ?? candidates[0] ?? null;
  } catch (e) {
    console.warn("[lead-engine] web search failed", name, e);
    return null;
  }
}
