/**
 * Discover + verify Instagram via web search:
 * query "{name} {city} Instagram", then match profile title/bio to the restaurant/website.
 *
 * Primary free path: open-source `ddgs` (Python) — no Browserbase/Serper required.
 * Optional paid: SERPER_API_KEY / BROWSERBASE_API_KEY.
 */

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { nameTokensForIdentity } from "@/lib/audit/website-identity";

const execFileAsync = promisify(execFile);

const SEARCH_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const JUNK_HANDLES = new Set([
  "explore",
  "popular",
  "p",
  "reel",
  "reels",
  "stories",
  "accounts",
  "about",
  "directory",
  "tv",
  "tags",
  "locations",
  "share",
]);

/** Platform / vendor / agency accounts that appear in restaurant site footers. */
const PLATFORM_HANDLES = new Set([
  "squarespace",
  "wix",
  "wordpress",
  "shopify",
  "godaddy",
  "facebook",
  "meta",
  "instagram",
  "google",
  "yelp",
  "tripadvisor",
  "deliveroo",
  "justeat",
  "ubereats",
  "zposltd",
  "zpos",
  "touchbistro",
  "opentable",
  "resy",
  "designmynight",
  "whenwe",
  "mailchimp",
  "klaviyo",
  "stripe",
  "paypal",
  "bookingcom",
  "expedia",
  "tripadvisoruk",
]);

const MIN_ACCEPT = Number(process.env.LEAD_ENGINE_IG_MATCH_MIN?.trim() || "55") || 55;

export type InstagramSearchHit = {
  url: string;
  handle: string;
  title: string;
  snippet: string;
};

export type InstagramMatchResult = {
  matched: boolean;
  score: number;
  reason: string;
  url: string | null;
  handle: string | null;
  title: string | null;
  snippet: string | null;
  source:
    | "ddgs"
    | "serper"
    | "browserbase"
    | "duckduckgo"
    | "bing"
    | "website"
    | "existing"
    | "none";
};

let lastSearchMs = 0;
let activeSearches = 0;
const searchWaiters: Array<() => void> = [];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function searchMaxParallel(): number {
  return Math.max(
    1,
    Math.min(6, Number(process.env.LEAD_ENGINE_IG_SEARCH_CONCURRENCY?.trim() || "3") || 3),
  );
}

function searchGapMs(): number {
  return Math.max(
    200,
    Number(process.env.LEAD_ENGINE_IG_SEARCH_GAP_MS?.trim() || "400") || 400,
  );
}

/** Semaphore for SERP calls — no deadlock-prone promise chain. */
async function rateLimitSearch() {
  await new Promise<void>((resolve) => {
    const tryAcquire = () => {
      if (activeSearches < searchMaxParallel()) {
        activeSearches += 1;
        resolve();
      } else {
        searchWaiters.push(tryAcquire);
      }
    };
    tryAcquire();
  });
  const wait = lastSearchMs + searchGapMs() - Date.now();
  if (wait > 0) await sleep(wait);
  lastSearchMs = Date.now();
}

function releaseSearchSlot() {
  activeSearches = Math.max(0, activeSearches - 1);
  const next = searchWaiters.shift();
  if (next) next();
}

function stripHtml(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

export function normalizeInstagramUrl(raw: string): { url: string; handle: string } | null {
  try {
    const withProto = raw.startsWith("http") ? raw : `https://${raw}`;
    const u = new URL(withProto);
    if (!/instagram\.com$/i.test(u.hostname.replace(/^www\./, ""))) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    const handle = (parts[0] ?? "").replace(/^@/, "").toLowerCase();
    if (!handle || JUNK_HANDLES.has(handle) || PLATFORM_HANDLES.has(handle) || handle.length < 2)
      return null;
    if (!/^[a-z0-9._]+$/i.test(handle)) return null;
    return {
      url: `https://www.instagram.com/${handle}/`,
      handle,
    };
  } catch {
    return null;
  }
}

function decodeDdgHref(href: string): string | null {
  try {
    const u = new URL(href, "https://duckduckgo.com");
    const uddg = u.searchParams.get("uddg");
    if (uddg) return decodeURIComponent(uddg);
    if (href.startsWith("http")) return href;
    return null;
  } catch {
    return null;
  }
}

function parseDdgHits(html: string): InstagramSearchHit[] {
  const hits: InstagramSearchHit[] = [];
  const seen = new Set<string>();

  const blockRe =
    /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|td)>|)/gi;

  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(html)) !== null) {
    const decoded = decodeDdgHref(m[1] ?? "");
    if (!decoded || !/instagram\.com/i.test(decoded)) continue;
    const norm = normalizeInstagramUrl(decoded);
    if (!norm || seen.has(norm.handle)) continue;
    seen.add(norm.handle);
    hits.push({
      url: norm.url,
      handle: norm.handle,
      title: stripHtml(m[2] ?? ""),
      snippet: stripHtml(m[3] ?? ""),
    });
  }

  // Fallback: raw instagram.com/handle mentions in page
  if (hits.length === 0) {
    for (const mm of html.matchAll(/instagram\.com\/([A-Za-z0-9._]{2,30})/gi)) {
      const norm = normalizeInstagramUrl(`https://www.instagram.com/${mm[1]}/`);
      if (!norm || seen.has(norm.handle)) continue;
      seen.add(norm.handle);
      hits.push({ url: norm.url, handle: norm.handle, title: "", snippet: "" });
    }
  }

  return hits.slice(0, 8);
}

async function searchDuckDuckGo(query: string): Promise<InstagramSearchHit[]> {
  await rateLimitSearch();
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(searchUrl, {
      headers: { "User-Agent": SEARCH_UA, Accept: "text/html" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    return parseDdgHits(await res.text());
  } finally {
    releaseSearchSlot();
  }
}

async function searchSerper(query: string): Promise<InstagramSearchHit[]> {
  const key = process.env.SERPER_API_KEY?.trim();
  if (!key) return [];
  await rateLimitSearch();
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: 10, gl: "uk", hl: "en" }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      organic?: Array<{ title?: string; snippet?: string; link?: string }>;
    };
    const hits: InstagramSearchHit[] = [];
    const seen = new Set<string>();
    for (const row of data.organic ?? []) {
      if (!row.link || !/instagram\.com/i.test(row.link)) continue;
      const norm = normalizeInstagramUrl(row.link);
      if (!norm || seen.has(norm.handle)) continue;
      seen.add(norm.handle);
      hits.push({
        url: norm.url,
        handle: norm.handle,
        title: row.title ?? "",
        snippet: row.snippet ?? "",
      });
    }
    return hits.slice(0, 8);
  } finally {
    releaseSearchSlot();
  }
}

async function searchBing(query: string): Promise<InstagramSearchHit[]> {
  await rateLimitSearch();
  try {
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en-GB`;
    const res = await fetch(searchUrl, {
      headers: { "User-Agent": SEARCH_UA, Accept: "text/html" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const hits: InstagramSearchHit[] = [];
    const seen = new Set<string>();

    const re =
      /<li\s+class="b_algo"[\s\S]*?<h2>\s*<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<p>([\s\S]*?)<\/p>|<div class="b_caption">([\s\S]*?)<\/div>)/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const link = m[1] ?? "";
      if (!/instagram\.com/i.test(link)) continue;
      const norm = normalizeInstagramUrl(link);
      if (!norm || seen.has(norm.handle)) continue;
      seen.add(norm.handle);
      hits.push({
        url: norm.url,
        handle: norm.handle,
        title: stripHtml(m[2] ?? ""),
        snippet: stripHtml(m[3] || m[4] || ""),
      });
    }

    if (!hits.length) {
      for (const mm of html.matchAll(/instagram\.com\/([A-Za-z0-9._]{2,30})/gi)) {
        const norm = normalizeInstagramUrl(`https://www.instagram.com/${mm[1]}/`);
        if (!norm || seen.has(norm.handle)) continue;
        seen.add(norm.handle);
        hits.push({ url: norm.url, handle: norm.handle, title: "", snippet: "" });
      }
    }

    return hits.slice(0, 8);
  } finally {
    releaseSearchSlot();
  }
}

async function searchBrowserbase(query: string): Promise<InstagramSearchHit[]> {
  const key = process.env.BROWSERBASE_API_KEY?.trim();
  if (!key) return [];
  await rateLimitSearch();
  try {
    const res = await fetch("https://api.browserbase.com/v1/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-BB-API-Key": key,
      },
      body: JSON.stringify({ query, numResults: 10 }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: Array<{ url?: string; title?: string; description?: string }>;
    };
    const hits: InstagramSearchHit[] = [];
    const seen = new Set<string>();
    for (const row of data.results ?? []) {
      if (!row.url || !/instagram\.com/i.test(row.url)) continue;
      const norm = normalizeInstagramUrl(row.url);
      if (!norm || seen.has(norm.handle)) continue;
      seen.add(norm.handle);
      hits.push({
        url: norm.url,
        handle: norm.handle,
        title: row.title ?? "",
        snippet: row.description ?? "",
      });
    }
    return hits.slice(0, 8);
  } finally {
    releaseSearchSlot();
  }
}

export function extractInstagramHandlesFromHtml(html: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of html.matchAll(/https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9._]{2,30})\/?/gi)) {
    const norm = normalizeInstagramUrl(`https://www.instagram.com/${m[1]}/`);
    if (!norm || seen.has(norm.handle)) continue;
    seen.add(norm.handle);
    out.push(norm.handle);
  }
  return out.slice(0, 8);
}

/** No SERP needed: Instagram linked on their own website + name/handle match. */
export function matchInstagramFromWebsite(input: {
  name: string;
  city: string;
  websiteUrl: string;
  websiteHtml: string;
}): InstagramMatchResult {
  const handles = extractInstagramHandlesFromHtml(input.websiteHtml);
  if (!handles.length) {
    return {
      matched: false,
      score: 0,
      reason: "no_ig_on_website",
      url: null,
      handle: null,
      title: null,
      snippet: null,
      source: "website",
    };
  }

  let best: { handle: string; score: number; reason: string } | null = null;
  for (const handle of handles) {
    // Do NOT invent a title from the restaurant name — that falsely inflates scores.
    const hit: InstagramSearchHit = {
      url: `https://www.instagram.com/${handle}/`,
      handle,
      title: `@${handle}`,
      snippet: "",
    };
    const scored = scoreInstagramHit({
      name: input.name,
      city: input.city,
      websiteUrl: input.websiteUrl,
      websiteHtml: input.websiteHtml,
      hit,
    });
    if (!best || scored.score > best.score) {
      best = { handle, score: scored.score, reason: scored.reason };
    }
  }

  // Linked on their own site is strong evidence, but still require a name/handle signal.
  const minOnSite = 55;
  if (!best || best.score < minOnSite) {
    return {
      matched: false,
      score: best?.score ?? 0,
      reason: best ? `below_threshold:${best.reason}` : "no_candidate",
      url: best ? `https://www.instagram.com/${best.handle}/` : null,
      handle: best?.handle ?? null,
      title: null,
      snippet: null,
      source: "website",
    };
  }

  const nameSignal =
    /\b(handle_slug|handle_tokens|title_name_strong|title_name_partial|bio_name)\b/.test(
      best.reason,
    );
  if (!nameSignal) {
    return {
      matched: false,
      score: best.score,
      reason: `no_name_signal:${best.reason}`,
      url: `https://www.instagram.com/${best.handle}/`,
      handle: best.handle,
      title: null,
      snippet: null,
      source: "website",
    };
  }

  return {
    matched: true,
    score: best.score,
    reason: best.reason,
    url: `https://www.instagram.com/${best.handle}/`,
    handle: best.handle,
    title: null,
    snippet: null,
    source: "website",
  };
}

export function resolveDdgsPython(): string | null {
  const fromEnv = process.env.DDGS_PYTHON?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const local = join(process.cwd(), ".venv-ig", "bin", "python");
  if (existsSync(local)) return local;
  return null;
}

export function hasDdgsScraper(): boolean {
  return Boolean(resolveDdgsPython());
}

export function hasInstagramSearchProvider(): boolean {
  return Boolean(
    process.env.SERPER_API_KEY?.trim() ||
      process.env.BROWSERBASE_API_KEY?.trim() ||
      hasDdgsScraper(),
  );
}

async function searchDdgs(query: string): Promise<InstagramSearchHit[]> {
  const python = resolveDdgsPython();
  if (!python) return [];
  await rateLimitSearch();
  const script = join(process.cwd(), "scripts", "ddgs-search.py");
  try {
    const { stdout, stderr } = await execFileAsync(python, [script, query], {
      timeout: 25_000,
      maxBuffer: 2_000_000,
      killSignal: "SIGKILL",
      env: { ...process.env, PYTHONWARNINGS: "ignore", PYTHONUNBUFFERED: "1" },
    });
    if (stderr?.trim() && !stdout?.trim()) {
      console.warn("[ig-search] ddgs stderr", stderr.slice(0, 200));
      return [];
    }
    const rows = JSON.parse(stdout || "[]") as Array<{
      title?: string;
      href?: string;
      body?: string;
    }>;
    const hits: InstagramSearchHit[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      const link = row.href ?? "";
      if (!/instagram\.com/i.test(link)) continue;
      const norm = normalizeInstagramUrl(link);
      if (!norm || seen.has(norm.handle)) continue;
      seen.add(norm.handle);
      hits.push({
        url: norm.url,
        handle: norm.handle,
        title: row.title ?? "",
        snippet: row.body ?? "",
      });
    }
    return hits.slice(0, 8);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[ig-search] ddgs failed", msg.slice(0, 160));
    return [];
  } finally {
    releaseSearchSlot();
  }
}

export async function searchInstagramCandidates(
  name: string,
  city: string,
): Promise<{
  hits: InstagramSearchHit[];
  source: "ddgs" | "serper" | "browserbase" | "duckduckgo" | "bing" | "none";
}> {
  const cleanName = name.replace(/\s+/g, " ").trim();
  const cleanCity = city.replace(/\s+/g, " ").trim();
  if (!cleanName) return { hits: [], source: "none" };

  const queries = [
    [cleanName, cleanCity, "Instagram"].filter(Boolean).join(" "),
    `"${cleanName}" Instagram${cleanCity ? ` ${cleanCity}` : ""}`,
    [cleanName, "restaurant", "Instagram", "UK"].filter(Boolean).join(" "),
    // Last resort: name only (ambiguous but recovers misses)
    `${cleanName} Instagram`,
  ].filter((q, i, arr) => q && arr.indexOf(q) === i);

  const mergeHits = (rows: InstagramSearchHit[]) => {
    const seen = new Set<string>();
    const out: InstagramSearchHit[] = [];
    for (const h of rows) {
      if (seen.has(h.handle)) continue;
      seen.add(h.handle);
      out.push(h);
    }
    return out.slice(0, 10);
  };

  if (hasDdgsScraper()) {
    let all: InstagramSearchHit[] = [];
    for (const query of queries) {
      const hits = await searchDdgs(query);
      all = mergeHits([...all, ...hits]);
      if (all.length >= 3) return { hits: all, source: "ddgs" };
    }
    if (all.length) return { hits: all, source: "ddgs" };
  }

  const primary = queries[0]!;

  if (process.env.SERPER_API_KEY?.trim()) {
    const hits = await searchSerper(primary);
    if (hits.length) return { hits, source: "serper" };
  }

  if (process.env.BROWSERBASE_API_KEY?.trim()) {
    const hits = await searchBrowserbase(primary);
    if (hits.length) return { hits, source: "browserbase" };
  }

  // Last-resort raw HTML SERPs (often IP-blocked).
  let hits = await searchDuckDuckGo(primary);
  if (hits.length) return { hits, source: "duckduckgo" };

  await sleep(1500);
  hits = await searchDuckDuckGo(primary);
  if (hits.length) return { hits, source: "duckduckgo" };

  hits = await searchBing(primary);
  return { hits, source: hits.length ? "bing" : "none" };
}

function tokenHitRate(tokens: string[], haystack: string): number {
  if (!tokens.length) return 0;
  const h = haystack.toLowerCase();
  let hit = 0;
  for (const t of tokens) {
    if (t.length < 2) continue;
    if (h.includes(t)) hit += 1;
  }
  return hit / tokens.length;
}

function websiteHostTokens(websiteUrl: string | null | undefined): string[] {
  if (!websiteUrl?.trim()) return [];
  try {
    const host = new URL(
      websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`,
    ).hostname
      .replace(/^www\./, "")
      .toLowerCase();
    const base = host.split(".")[0] ?? "";
    return nameTokensForIdentity(base.replace(/[-_]/g, " "));
  } catch {
    return [];
  }
}

/**
 * Score whether an Instagram search hit belongs to this restaurant.
 * Uses profile title + bio (from SERP snippet) vs restaurant name, city, website.
 */
export function scoreInstagramHit(input: {
  name: string;
  city: string;
  websiteUrl?: string | null;
  websiteHtml?: string | null;
  hit: InstagramSearchHit;
}): { score: number; reason: string } {
  const { name, city, websiteUrl, websiteHtml, hit } = input;
  const nameTokens = nameTokensForIdentity(name);
  const cityTok = city.trim().toLowerCase();
  const text = `${hit.title} ${hit.snippet}`.toLowerCase();
  const handle = hit.handle.toLowerCase();
  const nameSlug = compactSlug(name);
  const handleSlug = compactSlug(handle);

  let score = 0;
  const reasons: string[] = [];

  // Title pattern: "Restaurant Name (@handle) · Instagram"
  const titleNameRate = tokenHitRate(nameTokens, hit.title);
  if (titleNameRate >= 0.7) {
    score += 45;
    reasons.push("title_name_strong");
  } else if (titleNameRate >= 0.4) {
    score += 25;
    reasons.push("title_name_partial");
  }

  const bioNameRate = tokenHitRate(nameTokens, hit.snippet);
  if (bioNameRate >= 0.5) {
    score += 20;
    reasons.push("bio_name");
  }

  // Handle resembles restaurant name (ignore pure city tokens — too weak alone)
  const citySlug = compactSlug(city);
  const distinctiveTokens = nameTokens.filter((t) => t.length >= 4 && compactSlug(t) !== citySlug);

  if (nameSlug.length >= 5 && (handleSlug.includes(nameSlug) || nameSlug.includes(handleSlug))) {
    score += 30;
    reasons.push("handle_slug");
  } else if (distinctiveTokens.length >= 1) {
    const tokenInHandle = distinctiveTokens.filter((t) => handle.includes(t)).length;
    if (tokenInHandle >= 2) {
      score += 22;
      reasons.push("handle_tokens");
    } else if (
      distinctiveTokens.length === 1 &&
      tokenInHandle === 1 &&
      distinctiveTokens[0] &&
      distinctiveTokens[0].length >= 4
    ) {
      // Mononym brands only (e.g. "Tropea", "OMA")
      score += 18;
      reasons.push("handle_tokens");
    }
  }

  if (cityTok.length >= 3 && (text.includes(cityTok) || handle.includes(compactSlug(cityTok)))) {
    score += 12;
    reasons.push("city");
  }

  // Hospitality cues in bio (not required, but helps)
  if (/\b(restaurant|trattoria|bistro|kitchen|cafe|café|takeaway|pizza|curry|grill|bar|menu|food)\b/i.test(text)) {
    score += 8;
    reasons.push("hospitality_cue");
  }

  // Website domain / brand in bio or handle
  const hostTokens = websiteHostTokens(websiteUrl);
  if (hostTokens.length) {
    const hostRate = tokenHitRate(hostTokens, `${handle} ${text}`);
    if (hostRate >= 0.5) {
      score += 18;
      reasons.push("website_brand");
    }
  }

  // Strongest: website HTML already links this handle
  if (websiteHtml && new RegExp(`instagram\\.com/${handle}\\b`, "i").test(websiteHtml)) {
    score += 40;
    reasons.push("on_website");
  }

  // Penalize generic / directory / explore-ish titles
  if (/explore|locations|watch short videos|people around the world/i.test(text)) {
    score -= 35;
    reasons.push("junk_penalty");
  }

  // Require at least some name signal
  if (titleNameRate < 0.25 && bioNameRate < 0.25 && !reasons.includes("handle_slug") && !reasons.includes("on_website")) {
    score = Math.min(score, 20);
    reasons.push("weak_name_cap");
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    reason: reasons.join(",") || "no_signal",
  };
}

export async function verifyRestaurantInstagram(input: {
  name: string;
  city: string;
  websiteUrl?: string | null;
  existingInstagramUrl?: string | null;
  /** Optional pre-fetched website HTML for on-page link bonus. */
  websiteHtml?: string | null;
}): Promise<InstagramMatchResult> {
  const { name, city, websiteUrl, existingInstagramUrl, websiteHtml } = input;

  // Prefer re-validating an existing handle first (cheap if we search and it ranks).
  const existing = existingInstagramUrl ? normalizeInstagramUrl(existingInstagramUrl) : null;

  const { hits, source } = await searchInstagramCandidates(name, city);
  let allHits = hits;
  let usedSource = source;

  // If organic search failed but we already have a handle, look that profile up by handle.
  if (!allHits.length && existing) {
    const handleQuery = `${name} @${existing.handle} Instagram`;
    const second = await searchInstagramCandidates(handleQuery, "");
    allHits = second.hits;
    usedSource = second.source === "none" ? "none" : second.source;
  }

  if (!allHits.length) {
    return {
      matched: false,
      score: 0,
      reason: "no_search_hits",
      url: null,
      handle: null,
      title: null,
      snippet: null,
      source: "none",
    };
  }

  let best: {
    hit: InstagramSearchHit;
    score: number;
    reason: string;
  } | null = null;

  for (const hit of allHits) {
    const scored = scoreInstagramHit({ name, city, websiteUrl, websiteHtml, hit });
    if (!best || scored.score > best.score) {
      best = { hit, score: scored.score, reason: scored.reason };
    }
  }

  // If existing handle appears in results, prefer it when scores are close
  if (existing) {
    const existingHit =
      allHits.find((h) => h.handle === existing.handle) ??
      ({
        url: existing.url,
        handle: existing.handle,
        title: "",
        snippet: "",
      } satisfies InstagramSearchHit);
    const scoredExisting = scoreInstagramHit({
      name,
      city,
      websiteUrl,
      websiteHtml,
      hit: existingHit,
    });
    if (
      scoredExisting.score >= MIN_ACCEPT &&
      (!best || scoredExisting.score >= best.score - 5)
    ) {
      return {
        matched: true,
        score: scoredExisting.score,
        reason: scoredExisting.reason,
        url: existing.url,
        handle: existing.handle,
        title: existingHit.title || null,
        snippet: existingHit.snippet || null,
        source: "existing",
      };
    }
  }

  if (!best || best.score < MIN_ACCEPT) {
    return {
      matched: false,
      score: best?.score ?? 0,
      reason: best ? `below_threshold:${best.reason}` : "no_candidate",
      url: best?.hit.url ?? null,
      handle: best?.hit.handle ?? null,
      title: best?.hit.title ?? null,
      snippet: best?.hit.snippet ?? null,
      source: usedSource,
    };
  }

  return {
    matched: true,
    score: best.score,
    reason: best.reason,
    url: best.hit.url,
    handle: best.hit.handle,
    title: best.hit.title,
    snippet: best.hit.snippet,
    source: usedSource,
  };
}
