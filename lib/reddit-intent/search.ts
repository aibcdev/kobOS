import {
  buildRedditIntentQueries,
  getRedditIntentConfig,
  type RedditIntentConfig,
} from "@/lib/reddit-intent/config";
import { discoverRedditIntentViaDdg, REDDIT_INTENT_MAX_AGE_DAYS } from "@/lib/reddit-intent/ddg-discover";

export type RedditIntentHit = {
  id: string;
  subreddit: string;
  title: string;
  selftext: string;
  author: string;
  permalink: string;
  url: string;
  createdUtc: number;
  ageHours: number;
  score: number;
  numComments: number;
  matchedQuery: string;
  intentScore: number;
  intentReasons: string[];
  source?: string;
};

type RedditListingChild = {
  data?: {
    id?: string;
    subreddit?: string;
    title?: string;
    selftext?: string;
    author?: string;
    permalink?: string;
    url?: string;
    created_utc?: number;
    score?: number;
    num_comments?: number;
    stickied?: boolean;
    over_18?: boolean;
  };
};

const UA =
  process.env.REDDIT_USER_AGENT?.trim() ||
  "Mozilla/5.0 (compatible; KOB-RedditIntent/1.0; +https://trykob.com)";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url: string, label: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(25_000),
  });
  if (res.status === 429) {
    await sleep(6_000);
    const retry = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(25_000),
    });
    if (!retry.ok) throw new Error(`${label} ${retry.status} ${url}`);
    return retry.json();
  }
  if (!res.ok) throw new Error(`${label} ${res.status} ${url}`);
  return res.json();
}

const INTENT_RE =
  /\b(recommend(ation|ations)?|alternative(s)? to|looking for|got burned|has anyone used|anyone use|worth it|anyone got|best .+ for restaurants?|need(s|ed)? (a |an )?(good )?(website|marketing|ordering|seo|crm))\b/i;

const BUY_SIGNAL_RE =
  /\b(budget|urgent|asap|switching from|leave|leaving|replace|replacing|fed up|hate|scam|sketchy|overpriced|cancel(ling|led)?)\b/i;

export function scoreRedditIntent(title: string, body: string): { score: number; reasons: string[] } {
  const text = `${title}\n${body}`;
  let score = 0;
  const reasons: string[] = [];
  if (INTENT_RE.test(text)) {
    score += 40;
    reasons.push("intent_phrase");
  }
  if (BUY_SIGNAL_RE.test(text)) {
    score += 25;
    reasons.push("buy_signal");
  }
  if (/\b(restaurant|cafe|bistro|takeaway|food truck|diner)\b/i.test(text)) {
    score += 15;
    reasons.push("restaurant_context");
  }
  if (
    /\b(website|google (business|listing|maps)|online ordering|seo|reviews?|marketing|owner\.com|toast|chownow)\b/i.test(
      text,
    )
  ) {
    score += 20;
    reasons.push("kob_adjacent");
  }
  return { score, reasons };
}

function normalizePermalink(permalink?: string, id?: string, subreddit?: string): string {
  if (permalink?.startsWith("http")) return permalink;
  if (permalink) return `https://www.reddit.com${permalink}`;
  if (id && subreddit) return `https://www.reddit.com/r/${subreddit}/comments/${id}/`;
  return "";
}

function listingToHits(
  json: unknown,
  matchedQuery: string,
  cfg: RedditIntentConfig,
  nowSec: number,
  source: string,
): RedditIntentHit[] {
  const children = (json as { data?: { children?: RedditListingChild[] } })?.data?.children ?? [];
  const hits: RedditIntentHit[] = [];
  for (const child of children) {
    const d = child.data;
    if (!d?.id || !d.title || d.stickied || d.author === "[deleted]") continue;
    const created = Number(d.created_utc ?? 0);
    if (!created) continue;
    const ageHours = (nowSec - created) / 3600;
    if (ageHours > cfg.maxAgeHours) continue;
    if ((d.score ?? 0) < cfg.minScore) continue;
    const title = d.title;
    const selftext = (d.selftext ?? "").slice(0, 4000);
    const { score: intentScore, reasons } = scoreRedditIntent(title, selftext);
    if (intentScore < 40 && !INTENT_RE.test(`${title}\n${selftext}`)) continue;
    const permalink = normalizePermalink(d.permalink, d.id, d.subreddit);
    hits.push({
      id: d.id,
      subreddit: d.subreddit ?? "",
      title,
      selftext,
      author: d.author ?? "",
      permalink,
      url: d.url ?? permalink,
      createdUtc: created,
      ageHours: Math.round(ageHours * 10) / 10,
      score: d.score ?? 0,
      numComments: d.num_comments ?? 0,
      matchedQuery,
      intentScore,
      intentReasons: reasons,
      source,
    });
  }
  return hits;
}

function pullpushToHits(
  json: unknown,
  matchedQuery: string,
  cfg: RedditIntentConfig,
  nowSec: number,
): RedditIntentHit[] {
  const data = (json as { data?: Array<Record<string, unknown>> })?.data ?? [];
  const hits: RedditIntentHit[] = [];
  for (const d of data) {
    const id = String(d.id ?? "");
    const title = String(d.title ?? "");
    if (!id || !title) continue;
    const created = Number(d.created_utc ?? 0);
    if (!created) continue;
    const ageHours = (nowSec - created) / 3600;
    if (ageHours > cfg.maxAgeHours) continue;
    const selftext = String(d.selftext ?? "").slice(0, 4000);
    const { score: intentScore, reasons } = scoreRedditIntent(title, selftext);
    if (intentScore < 40 && !INTENT_RE.test(`${title}\n${selftext}`)) continue;
    const subreddit = String(d.subreddit ?? "");
    const permalink = normalizePermalink(
      typeof d.permalink === "string" ? d.permalink : undefined,
      id,
      subreddit,
    );
    hits.push({
      id,
      subreddit,
      title,
      selftext,
      author: String(d.author ?? ""),
      permalink,
      url: permalink,
      createdUtc: created,
      ageHours: Math.round(ageHours * 10) / 10,
      score: Number(d.score ?? 0),
      numComments: Number(d.num_comments ?? 0),
      matchedQuery,
      intentScore,
      intentReasons: reasons,
      source: "pullpush",
    });
  }
  return hits;
}

async function searchPullpush(
  subreddit: string,
  query: string,
  cfg: RedditIntentConfig,
): Promise<RedditIntentHit[]> {
  const nowSec = Date.now() / 1000;
  const after = Math.floor(nowSec - cfg.maxAgeHours * 3600);
  const pp = new URLSearchParams({
    subreddit,
    size: String(Math.min(100, Math.max(25, cfg.limitPerQuery * 2))),
    sort: "desc",
    sort_type: "created_utc",
    after: String(after),
  });
  if (query && query !== "*" && query !== "new_feed") pp.set("q", query);
  const json = await fetchJson(`https://api.pullpush.io/reddit/search/submission/?${pp}`, "pullpush");
  return pullpushToHits(json, query || "subreddit_recent", cfg, nowSec);
}

async function searchRedditHosts(
  subreddit: string,
  query: string,
  cfg: RedditIntentConfig,
): Promise<RedditIntentHit[]> {
  // Prefer Pullpush — reddit.com/old.reddit often 403 from datacenter IPs.
  try {
    const hits = await searchPullpush(subreddit, query, cfg);
    if (hits.length) return hits;
  } catch {
    /* fall through */
  }

  const params = new URLSearchParams({
    q: query,
    restrict_sr: "on",
    sort: "new",
    t: cfg.maxAgeHours <= 24 ? "day" : cfg.maxAgeHours <= 168 ? "week" : "month",
    limit: String(cfg.limitPerQuery),
    type: "link",
  });
  const path = `/r/${encodeURIComponent(subreddit)}/search.json?${params}`;
  const hosts = ["https://old.reddit.com", "https://www.reddit.com"];
  const nowSec = Date.now() / 1000;
  let lastErr: Error | null = null;
  for (const host of hosts) {
    try {
      const json = await fetchJson(`${host}${path}`, host);
      return listingToHits(json, query, cfg, nowSec, host);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  // Return empty pullpush result rather than throw if archive answered with 0 in-window hits
  try {
    return await searchPullpush(subreddit, query, cfg);
  } catch (e) {
    throw lastErr ?? (e instanceof Error ? e : new Error(String(e)));
  }
}

async function newFeedHosts(subreddit: string, cfg: RedditIntentConfig): Promise<RedditIntentHit[]> {
  // Approximate "new" via archive: recent posts in sub, then intent-filter
  try {
    const hits = await searchPullpush(subreddit, "*", cfg);
    if (hits.length) return hits.filter((h) => h.intentScore >= 40);
  } catch {
    /* fall through */
  }
  const path = `/r/${encodeURIComponent(subreddit)}/new.json?limit=${cfg.limitPerQuery}`;
  const hosts = ["https://old.reddit.com", "https://www.reddit.com"];
  const nowSec = Date.now() / 1000;
  let lastErr: Error | null = null;
  for (const host of hosts) {
    try {
      const json = await fetchJson(`${host}${path}`, host);
      return listingToHits(json, "new_feed", cfg, nowSec, host).filter((h) => h.intentScore >= 40);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastErr ?? new Error("new feed failed");
}

export async function searchSubredditIntent(
  subreddit: string,
  query: string,
  cfg: RedditIntentConfig,
): Promise<RedditIntentHit[]> {
  return searchRedditHosts(subreddit, query, cfg);
}

export async function scanSubredditNew(subreddit: string, cfg: RedditIntentConfig): Promise<RedditIntentHit[]> {
  return newFeedHosts(subreddit, cfg);
}

export type RedditIntentScanResult = {
  scannedAt: string;
  config: RedditIntentConfig;
  queriesRun: number;
  hits: RedditIntentHit[];
  errors: string[];
};

export async function runRedditIntentScan(options?: {
  subreddits?: string[];
  maxQueriesPerSub?: number;
  includeNewFeed?: boolean;
}): Promise<RedditIntentScanResult> {
  const cfg = getRedditIntentConfig();
  const subreddits = options?.subreddits?.length ? options.subreddits : cfg.subreddits;
  const queries = buildRedditIntentQueries();
  const maxQ = options?.maxQueriesPerSub ?? Math.min(12, queries.length);
  const selected = queries.slice(0, maxQ);
  const byId = new Map<string, RedditIntentHit>();
  const errors: string[] = [];
  let queriesRun = 0;

  // 1) Live web discovery (works when reddit.com JSON is blocked)
  const useDdg = process.env.REDDIT_INTENT_SKIP_DDG?.trim() !== "1";
  if (useDdg) {
    const ddgQueries = [
      "anyone got recommendations",
      "looking for a good",
      "alternative to",
      "got burned",
      "has anyone used",
      "restaurant website",
      "restaurant marketing",
      "online ordering",
      "google business",
      ...selected.slice(0, 4),
    ];
    const ddg = discoverRedditIntentViaDdg({
      subreddits,
      queries: [...new Set(ddgQueries)],
      maxPerQuery: 6,
    });
    errors.push(...ddg.errors);
    for (const h of ddg.hits) byId.set(h.id, h);
  }

  // 2) Optional archive / reddit JSON (Pullpush laggy; reddit.com often 403 from servers)
  const useArchive = process.env.REDDIT_INTENT_ARCHIVE?.trim() === "1";
  if (useArchive) {
    for (const sub of subreddits) {
      if (options?.includeNewFeed !== false) {
        try {
          const feedHits = await scanSubredditNew(sub, cfg);
          for (const h of feedHits) {
            const prev = byId.get(h.id);
            if (!prev || h.intentScore > prev.intentScore) byId.set(h.id, h);
          }
          await sleep(800);
        } catch (e) {
          errors.push(`new/${sub}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      for (const q of selected) {
        queriesRun += 1;
        try {
          const hits = await searchSubredditIntent(sub, q, cfg);
          for (const h of hits) {
            const prev = byId.get(h.id);
            if (prev?.source === "ddg" && h.source === "pullpush" && h.ageHours > 24) continue;
            if (!prev || h.intentScore > prev.intentScore) byId.set(h.id, h);
          }
        } catch (e) {
          errors.push(`search/${sub}/${q}: ${e instanceof Error ? e.message : String(e)}`);
        }
        await sleep(900);
      }
    }
  } else {
    queriesRun = selected.length * subreddits.length;
  }

  const maxAgeHours = Math.min(cfg.maxAgeHours, REDDIT_INTENT_MAX_AGE_DAYS * 24);
  const hits = [...byId.values()]
    .filter((h) => h.ageHours <= maxAgeHours)
    .filter((h) => {
      // Keep hand-raisers relevant to KOB (site / Google / ordering / marketing software)
      const blob = `${h.title}\n${h.selftext}`.toLowerCase();
      if (h.intentReasons.includes("kob_adjacent")) return true;
      return /\b(website|seo|google|ordering|marketing|owner\.com|toast|crm|reviews?|listing)\b/.test(
        blob,
      );
    })
    .sort((a, b) => b.intentScore - a.intentScore || a.ageHours - b.ageHours);

  return {
    scannedAt: new Date().toISOString(),
    config: { ...cfg, subreddits },
    queriesRun,
    hits,
    errors,
  };
}

export function draftRedditIntentEmail(hit: RedditIntentHit): { subject: string; body: string } {
  const sub = hit.subreddit ? `r/${hit.subreddit}` : "reddit";
  const snippet = hit.title.replace(/\s+/g, " ").slice(0, 90);
  const subject = `Re: your ${sub} post about ${snippet.slice(0, 40)}…`;
  const body = `hey — saw your post in ${sub} ("${snippet}").

we help independent restaurants get more customers from their website + Google listing (free scan → clear next steps). happy to share what we'd fix first if useful: https://trykob.com/audit

— Tim · KOB`;
  return { subject, body };
}
