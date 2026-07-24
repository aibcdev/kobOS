/** Guess owner website when Just Eat HTML and Google Places are unavailable. */

import {
  nameTokensForIdentity,
  scoreWebsiteIdentity,
  websiteIdentityMinScore,
} from "@/lib/audit/website-identity";

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

/** @deprecated Prefer nameTokensForIdentity — kept for callers. */
export function nameTokens(name: string): string[] {
  return nameTokensForIdentity(name);
}

export function buildDomainCandidates(name: string, city: string): string[] {
  const full = compactSlug(name);
  const cityPart = citySlug(city);
  const tokens = nameTokensForIdentity(name);
  const short = compactSlug(tokens.slice(0, 2).join(""));
  // Never lead with a single first-token .com (Kingsway → kingsway.com).
  // Prefer full/short stems; only include first token when paired with city.
  const first = compactSlug(tokens[0] ?? name);
  const nameCity = cityPart ? `${first}${cityPart}` : null;
  const shortCity = cityPart ? `${short}${cityPart}` : null;

  const stems = [
    short,
    full,
    cityPart ? `${full}${cityPart}` : null,
    nameCity,
    shortCity,
  ].filter(Boolean) as string[];

  const suffixes = ["", "indian", "takeaway", "food", "pizza", "kebab"];
  const hosts: string[] = [];
  for (const stem of stems) {
    if (stem.length < 5) continue;
    for (const suffix of suffixes) {
      const s = suffix ? `${stem}${suffix}` : stem;
      // Prefer UK TLDs first for UK restaurants
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
  return scoreWebsiteIdentity({ restaurantName: name, city, html, url }).score;
}

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
  const minScore = websiteIdentityMinScore();

  let best: { url: string; score: number } | null = null;

  const checks = candidates.map(async (candidate) => {
    const html = await fetchCandidateHtml(candidate, timeoutMs);
    if (!html) return null;
    const identity = scoreWebsiteIdentity({
      restaurantName: name,
      city,
      html,
      url: candidate,
    });
    if (!identity.matched || identity.score < minScore) return null;
    return { url: candidate, score: identity.score };
  });

  const results = await Promise.all(checks);
  for (const hit of results) {
    if (!hit) continue;
    if (!best || hit.score > best.score) best = hit;
  }

  return best?.url ?? null;
}
