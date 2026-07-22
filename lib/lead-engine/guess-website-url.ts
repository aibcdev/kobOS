/** Guess owner website when Just Eat HTML and Google Places are unavailable. */

const STOP_WORDS = new Set([
  "and",
  "the",
  "at",
  "in",
  "of",
  "ltd",
  "limited",
  "uk",
  "restaurant",
  "takeaway",
  "cafe",
  "bar",
  "grill",
  "kitchen",
]);

function compactSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/24\s*\/\s*7/g, "247")
    .replace(/[^a-z0-9]+/g, "");
}

function citySlug(city: string): string {
  return compactSlug(city);
}

export function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/24\s*\/\s*7/g, "247")
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

export function buildDomainCandidates(name: string, city: string): string[] {
  const full = compactSlug(name);
  const cityPart = citySlug(city);
  const tokens = nameTokens(name);
  const short = compactSlug(tokens.slice(0, 2).join(""));
  const first = compactSlug(tokens[0] ?? name);

  const nameCity = `${first}${cityPart}`;
  const shortCity = `${short}${cityPart}`;
  const stems = full.match(/\d/)
    ? [full, `${full}${cityPart}`, short, nameCity, shortCity, first]
    : [short, full, `${full}${cityPart}`, nameCity, shortCity, first];
  const suffixes = ["", "indian", "takeaway", "food", "pizza", "kebab"];
  const hosts: string[] = [];
  for (const stem of stems) {
    for (const suffix of suffixes) {
      const s = suffix ? `${stem}${suffix}` : stem;
      hosts.push(`${s}.co.uk`, `${s}.uk`, `${s}.com`);
      if (cityPart) {
        hosts.push(`${s}${cityPart}.co.uk`, `${s}${cityPart}.uk`);
      }
    }
  }
  return [...new Set(hosts.map((h) => `https://${h}`))];
}

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const PARKED_PAGE_RE =
  /domain for sale|buy this domain|parked free|godaddy|sedo\.com|hugedomains|is for sale|coming soon/i;

export function alternateWebsiteTld(url: string): string | null {
  try {
    const host = new URL(url).hostname;
    if (host.endsWith(".co.uk")) return url.replace(".co.uk", ".uk");
    if (host.endsWith(".uk") && !host.endsWith(".co.uk")) {
      return url.replace(/\.uk(\/|$)/, ".co.uk$1");
    }
  } catch {
    return null;
  }
  return null;
}

/** Score how well a fetched page matches the restaurant name + city. */
export function scoreWebsiteHtmlMatch(
  name: string,
  city: string,
  html: string,
  url: string,
): number {
  if (html.length < 800) return -100;
  if (PARKED_PAGE_RE.test(html)) return -1000;

  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.toLowerCase() ?? "";
  const body = html.slice(0, 60_000).toLowerCase();
  const tokens = nameTokens(name);
  const cityCompact = citySlug(city);
  const nameCompact = compactSlug(name);

  let score = 0;

  try {
    const host = new URL(url).hostname.replace(/^www\./, "").replace(/\.(co\.uk|uk|com)$/, "");
    if (nameCompact.length >= 4 && host.includes(nameCompact)) score += 50;
    else if (tokens.length >= 2) {
      const joined = compactSlug(tokens.slice(0, 2).join(""));
      if (joined.length >= 4 && host.includes(joined)) score += 35;
    }
  } catch {
    /* ignore */
  }

  for (const token of tokens) {
    if (token.length < 3) continue;
    if (title.includes(token)) score += 25;
    else if (body.includes(token)) score += 8;
  }

  if (cityCompact.length >= 3) {
    if (body.includes(city.toLowerCase()) || body.includes(cityCompact)) score += 20;
  }

  if (tokens.length <= 1 && score < 30) return -100;

  return score;
}

const MIN_MATCH_SCORE = 25;

async function fetchCandidateHtml(url: string, timeoutMs: number): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (/checking your browser|cf-browser-verification|cloudflare\.com\/5xx|404 not found/i.test(html)) {
      return null;
    }
    return html;
  } catch {
    return null;
  }
}

export async function discoverWebsiteByDomainGuess(
  name: string,
  city: string,
): Promise<string | null> {
  const candidates = [...new Set(buildDomainCandidates(name, city))].slice(0, 24);
  const timeoutMs = Math.max(3000, Number(process.env.LEAD_ENGINE_DOMAIN_TIMEOUT_MS?.trim() || "5000") || 5000);

  let best: { url: string; score: number } | null = null;

  const checks = candidates.map(async (candidate) => {
    const html = await fetchCandidateHtml(candidate, timeoutMs);
    if (!html) return null;
    const score = scoreWebsiteHtmlMatch(name, city, html, candidate);
    if (score < MIN_MATCH_SCORE) return null;
    return { url: candidate, score };
  });

  const results = await Promise.all(checks);
  for (const hit of results) {
    if (!hit) continue;
    if (!best || hit.score > best.score) best = hit;
  }

  return best?.url ?? null;
}
