import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

import { scoreRedditIntent, type RedditIntentHit } from "@/lib/reddit-intent/search";

const COMMENT_RE =
  /reddit\.com\/r\/([A-Za-z0-9_]+)\/comments\/([a-z0-9]+)(?:\/([^/?#\s]*))?/i;

/** Max age for intent hits — older than this is binned. */
export const REDDIT_INTENT_MAX_AGE_DAYS = 365;

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

/**
 * Parse dates from DuckDuckGo Reddit snippets, e.g. "28 Mar 2026 …" or "15 Jun 2023 …".
 * Returns unix seconds or null.
 */
export function parseDdgSnippetDate(text: string, now = new Date()): number | null {
  const t = text.trim();
  const m1 = t.match(
    /\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(20\d{2})\b/i,
  );
  if (m1) {
    const day = Number(m1[1]);
    const mon = MONTHS[m1[2]!.toLowerCase()];
    const year = Number(m1[3]);
    if (mon == null || !Number.isFinite(day) || !Number.isFinite(year)) return null;
    const d = new Date(Date.UTC(year, mon, day, 12, 0, 0));
    if (Number.isNaN(d.getTime())) return null;
    return Math.floor(d.getTime() / 1000);
  }
  const m2 = t.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (m2) {
    const d = new Date(Date.UTC(Number(m2[1]), Number(m2[2]) - 1, Number(m2[3]), 12, 0, 0));
    if (Number.isNaN(d.getTime())) return null;
    return Math.floor(d.getTime() / 1000);
  }
  const rel = t.match(/\b(\d+)\s*(mo|mos|month|months|yr|yrs|year|years|w|wk|wks|week|weeks|d|day|days)\s+ago\b/i);
  if (rel) {
    const n = Number(rel[1]);
    const unit = rel[2]!.toLowerCase();
    const d = new Date(now);
    if (unit.startsWith("y")) d.setFullYear(d.getFullYear() - n);
    else if (unit.startsWith("mo")) d.setMonth(d.getMonth() - n);
    else if (unit.startsWith("w")) d.setDate(d.getDate() - n * 7);
    else d.setDate(d.getDate() - n);
    return Math.floor(d.getTime() / 1000);
  }
  return null;
}

export type DdgHit = { title: string; href: string; body: string };

function ddgsBin(): string {
  const venv = join(process.cwd(), ".venv-ig", "bin", "python");
  if (existsSync(venv)) return venv;
  return "python3";
}

export function runDdgsSearch(query: string): DdgHit[] {
  const script = join(process.cwd(), "scripts", "ddgs-search.py");
  const res = spawnSync(ddgsBin(), [script, query], {
    encoding: "utf8",
    timeout: 45_000,
    env: process.env,
  });
  if (res.status !== 0) {
    const err = (res.stderr || res.stdout || "").trim();
    throw new Error(err || `ddgs failed status=${res.status}`);
  }
  try {
    const parsed = JSON.parse(res.stdout || "[]") as DdgHit[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function ddgResultToIntentHit(row: DdgHit, matchedQuery: string): RedditIntentHit | null {
  const m = row.href.match(COMMENT_RE) || row.title.match(COMMENT_RE);
  if (!m) return null;
  const subreddit = m[1]!;
  const id = m[2]!;
  const title = row.title.replace(/\s*[:\-–]\s*r\/\w+.*$/i, "").trim() || row.title;
  const selftext = row.body || "";
  const createdUtc = parseDdgSnippetDate(`${row.body}\n${row.title}`);
  // No reliable date → bin (DDG often resurfaces ancient threads as "fresh")
  if (createdUtc == null) return null;
  const ageHours = (Date.now() / 1000 - createdUtc) / 3600;
  if (ageHours > REDDIT_INTENT_MAX_AGE_DAYS * 24) return null;

  const { score: intentScore, reasons } = scoreRedditIntent(title, selftext);
  if (intentScore < 35) return null;
  const permalink = `https://www.reddit.com/r/${subreddit}/comments/${id}/`;
  return {
    id,
    subreddit,
    title,
    selftext: selftext.slice(0, 4000),
    author: "",
    permalink,
    url: permalink,
    createdUtc,
    ageHours: Math.round(ageHours * 10) / 10,
    score: 0,
    numComments: 0,
    matchedQuery,
    intentScore,
    intentReasons: [...reasons, "ddg_live"],
    source: "ddg",
  };
}

/** Live discovery when reddit.com JSON is blocked and archives lag. */
export function discoverRedditIntentViaDdg(input: {
  subreddits: string[];
  queries: string[];
  maxPerQuery?: number;
}): { hits: RedditIntentHit[]; errors: string[] } {
  const byId = new Map<string, RedditIntentHit>();
  const errors: string[] = [];
  const maxPer = input.maxPerQuery ?? 8;

  for (const sub of input.subreddits) {
    for (const q of input.queries) {
      const ddgQuery = `site:reddit.com/r/${sub} ${q}`;
      try {
        const rows = runDdgsSearch(ddgQuery).slice(0, maxPer);
        for (const row of rows) {
          const hit = ddgResultToIntentHit(row, q);
          if (!hit) continue;
          if (hit.subreddit.toLowerCase() !== sub.toLowerCase()) continue;
          const prev = byId.get(hit.id);
          if (!prev || hit.intentScore > prev.intentScore) byId.set(hit.id, hit);
        }
      } catch (e) {
        errors.push(`ddg/${sub}/${q}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  return {
    hits: [...byId.values()].sort((a, b) => b.intentScore - a.intentScore),
    errors,
  };
}
