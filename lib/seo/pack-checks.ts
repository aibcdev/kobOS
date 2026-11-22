/**
 * Checks over the SEO data pack (seo/pack) that need no judgement: each one reads the crawl, Search Console exports
 * or visit counts and returns findings. Fixing them is a separate, reviewed change.
 */
import { bannedWordsIn } from "@/lib/copy/banned-words";
import { similarity, type GscRow } from "./gsc-shortlist";
import type { PageFacts } from "./site-crawl";

export type Severity = "high" | "medium" | "low";

export type Finding = { check: string; severity: Severity; path: string; detail: string };

export type QueryPageRow = GscRow & { path: string };

export type IndexingRow = { path: string; reason: string };

export type LandingRow = { path: string; entries: number; audits: number };

const finding = (check: string, severity: Severity, path: string, detail: string): Finding => ({ check, severity, path, detail });

/** Per-restaurant reports and the like: many near-identical pages that are fine as they are. */
const TEMPLATED = /^\/(audit|audit-reviews|review)\/[^/]+/;

export function pathOf(urlOrPath: string): string {
  let p = urlOrPath;
  try {
    p = new URL(urlOrPath).pathname;
  } catch {
    /* already a path */
  }
  return p.length > 1 ? p.replace(/\/+$/, "") : p;
}

/** 200, not noindex, and canonical to itself (or no canonical). */
export function isIndexable(p: PageFacts): boolean {
  return p.status === 200 && !p.noindex && (!p.canonical || pathOf(p.canonical) === p.path);
}

export function indexingChecks(pages: PageFacts[], sitemap: string[]): Finding[] {
  const out: Finding[] = [];
  const byPath = new Map(pages.map((p) => [p.path, p]));
  const inSitemap = new Set(sitemap);
  for (const path of sitemap) {
    const p = byPath.get(path);
    if (!p) continue;
    if (p.status >= 300 && p.status < 400) out.push(finding("indexing", "high", path, `In the sitemap but redirects (${p.status}) to ${p.redirectTo ?? "?"}. List the destination instead.`));
    else if (p.status !== 200) out.push(finding("indexing", "high", path, `In the sitemap but returns ${p.status}.`));
    else if (p.noindex) out.push(finding("indexing", "high", path, "In the sitemap but marked noindex. Drop it from the sitemap or remove noindex."));
  }
  for (const p of pages) {
    if (p.status !== 200 || !p.canonical) continue;
    const target = pathOf(p.canonical);
    if (target === p.path) continue;
    const t = byPath.get(target);
    if (t && t.status !== 200) out.push(finding("indexing", "high", p.path, `Canonical points at ${target}, which returns ${t.status}${t.redirectTo ? ` → ${t.redirectTo}` : ""}.`));
    else if (!p.noindex && inSitemap.has(p.path)) out.push(finding("indexing", "medium", p.path, `In the sitemap but canonicalises to ${target}.`));
  }
  for (const p of pages) {
    if (isIndexable(p) && !inSitemap.has(p.path) && !TEMPLATED.test(p.path)) {
      out.push(finding("indexing", "low", p.path, "Indexable but missing from the sitemap. Add it, or noindex it if it shouldn't rank."));
    }
  }
  return out;
}

export function titleChecks(pages: PageFacts[]): Finding[] {
  const out: Finding[] = [];
  const live = pages.filter((p) => isIndexable(p) && !TEMPLATED.test(p.path));
  const dupes = (key: (p: PageFacts) => string) => {
    const groups = new Map<string, string[]>();
    for (const p of live) {
      const k = key(p).toLowerCase();
      if (k) groups.set(k, [...(groups.get(k) ?? []), p.path]);
    }
    return [...groups.values()].filter((g) => g.length > 1);
  };
  for (const p of live) {
    if (!p.title) out.push(finding("titles", "high", p.path, "No <title>."));
    else if (p.title.length > 60) out.push(finding("titles", "low", p.path, `Title is ${p.title.length} characters; Google cuts it at about 60: "${p.title}".`));
    else if (p.title.length < 15) out.push(finding("titles", "low", p.path, `Title is only ${p.title.length} characters: "${p.title}".`));
    if (p.h1.length === 0) out.push(finding("titles", "medium", p.path, "No H1."));
    else if (p.h1.length > 1) out.push(finding("titles", "low", p.path, `${p.h1.length} H1s: ${p.h1.map((h) => `"${h}"`).join(", ")}.`));
    if (!p.description) out.push(finding("descriptions", "medium", p.path, "No meta description."));
    else if (p.description.length > 160) out.push(finding("descriptions", "low", p.path, `Description is ${p.description.length} characters; keep it under 160.`));
  }
  for (const g of dupes((p) => p.title)) {
    for (const path of g) out.push(finding("titles", "high", path, `Same title as ${g.filter((x) => x !== path).join(", ")}.`));
  }
  for (const g of dupes((p) => p.description)) {
    for (const path of g) out.push(finding("descriptions", "medium", path, `Same description as ${g.filter((x) => x !== path).join(", ")}.`));
  }
  return out;
}

export function contentChecks(pages: PageFacts[], minWords = 300): Finding[] {
  const out: Finding[] = [];
  for (const p of pages) {
    if (!isIndexable(p) || TEMPLATED.test(p.path)) continue;
    if (p.words < minWords) out.push(finding("thin", "low", p.path, `About ${p.words} words of text. Thin pages rarely rank; add a real answer or fold it into a stronger page.`));
    const banned = [p.title, p.description, ...p.h1].flatMap((t) => bannedWordsIn(t));
    if (banned.length) out.push(finding("wording", "high", p.path, `Title, description or H1 uses banned words: ${[...new Set(banned)].join(", ")}.`));
    if (p.unlabelledInputs) out.push(finding("semantics", "low", p.path, `${p.unlabelledInputs} form field(s) without a label.`));
    if (!p.hasMain) out.push(finding("semantics", "low", p.path, "No <main> element."));
  }
  return out;
}

export function inboundLinks(pages: PageFacts[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of pages) {
    if (p.status !== 200) continue;
    for (const l of p.links) if (l !== p.path) counts.set(l, (counts.get(l) ?? 0) + 1);
  }
  return counts;
}

export function linkChecks(pages: PageFacts[], impressionsByPath: Map<string, number> = new Map()): Finding[] {
  const out: Finding[] = [];
  const inbound = inboundLinks(pages);
  const title = meaningfulWords(pages.filter(isIndexable).map((p) => p.title));
  for (const p of pages) {
    if (!isIndexable(p) || p.path === "/" || TEMPLATED.test(p.path)) continue;
    const n = inbound.get(p.path) ?? 0;
    const impressions = impressionsByPath.get(p.path) ?? 0;
    if (n < 2) out.push(finding("links", impressions ? "high" : "medium", p.path, `Only ${n} internal link(s) point here${impressions ? ` though it has ${impressions} Search Console impressions` : ""}.${suggestLinks(p, pages, title)}`));
    else if (p.depth > 3) out.push(finding("links", "low", p.path, `${p.depth} clicks from the home page.`));
  }
  return out;
}

/** Pages whose titles share the most words with this one: the natural places to link from. */
function suggestLinks(page: PageFacts, pages: PageFacts[], title: (t: string) => string): string {
  const from = pages
    .filter((p) => isIndexable(p) && p.path !== page.path && !p.links.includes(page.path) && !TEMPLATED.test(p.path))
    .map((p) => ({ path: p.path, s: similarity(title(p.title), title(page.title)) }))
    .filter((x) => x.s >= 0.25)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
    .map((x) => x.path);
  return from.length ? ` Link from: ${from.join(", ")}.` : "";
}

/**
 * The words that carry a title's meaning: site-wide boilerplate ("| KOB", "The Restaurant Manager", "(2026)") is any
 * word found in at least 40% of titles, and it's dropped so two pages don't look alike just for sharing the suffix.
 */
function meaningfulWords(texts: string[]): (text: string) => string {
  const df = new Map<string, number>();
  const words = (t: string) => [...new Set(t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean))];
  for (const t of texts) for (const w of words(t)) df.set(w, (df.get(w) ?? 0) + 1);
  const common = new Set([...df].filter(([, n]) => texts.length >= 5 && n / texts.length >= 0.4).map(([w]) => w));
  return (t) => words(t).filter((w) => !common.has(w)).join(" ");
}

/** Without Search Console: pages whose titles or H1s nearly match, which tend to compete for the same searches. */
export function overlapChecks(pages: PageFacts[], threshold = 0.8): Finding[] {
  const out: Finding[] = [];
  const live = pages.filter((p) => isIndexable(p) && !TEMPLATED.test(p.path));
  const title = meaningfulWords(live.map((p) => p.title));
  const h1 = meaningfulWords(live.map((p) => p.h1[0] ?? ""));
  // Exact duplicates are reported by titleChecks; fewer than three meaningful words is too little to compare.
  const close = (x: string, y: string) => (x.split(" ").length >= 3 && y.split(" ").length >= 3 && x !== y ? similarity(x, y) : 0);
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i];
      const b = live[j];
      const s = Math.max(close(title(a.title), title(b.title)), close(h1(a.h1[0] ?? ""), h1(b.h1[0] ?? "")));
      if (s >= threshold) {
        out.push(finding("competing", "medium", a.path, `Title/H1 nearly matches ${b.path} (${Math.round(s * 100)}% of words shared). Make each answer a different question, or merge them.`));
      }
    }
  }
  return out;
}

/** With Search Console query+page data: one query, two or more of our pages showing for it. */
export function competingQueries(rows: QueryPageRow[], minImpressions = 10): Finding[] {
  const byQuery = new Map<string, QueryPageRow[]>();
  for (const r of rows) {
    if (r.impressions < 1) continue;
    const k = r.query.toLowerCase();
    byQuery.set(k, [...(byQuery.get(k) ?? []), r]);
  }
  const out: Finding[] = [];
  for (const [query, rs] of byQuery) {
    const paths = new Set(rs.map((r) => r.path));
    const total = rs.reduce((n, r) => n + r.impressions, 0);
    if (paths.size < 2 || total < minImpressions) continue;
    const sorted = [...rs].sort((a, b) => b.impressions - a.impressions);
    out.push(finding("competing", total >= 100 ? "high" : "medium", sorted[0].path, `"${query}": ${paths.size} pages split ${total} impressions (${sorted.map((r) => `${r.path} ${r.impressions} @ ${r.position.toFixed(1)}`).join("; ")}). Pick one page for it.`));
  }
  return out;
}

/** Queries ranking 4–20: close enough that a better title, answer or a few links can move them. */
export function strikingDistance(rows: QueryPageRow[], minImpressions = 10): Finding[] {
  const byPath = new Map<string, QueryPageRow[]>();
  for (const r of rows) {
    if (r.position < 4 || r.position > 20 || r.impressions < minImpressions) continue;
    byPath.set(r.path, [...(byPath.get(r.path) ?? []), r]);
  }
  return [...byPath].map(([path, rs]) => {
    const top = rs.sort((a, b) => b.impressions - a.impressions).slice(0, 5);
    const total = rs.reduce((n, r) => n + r.impressions, 0);
    return finding("striking-distance", total >= 200 ? "high" : "medium", path, `${rs.length} queries at positions 4–20: ${top.map((r) => `"${r.query}" (${r.impressions} impr, pos ${r.position.toFixed(1)})`).join("; ")}. Answer them on the page, in the title or an H2.`);
  });
}

/** Search Console "not indexed" rows, matched against what the crawl saw. */
export function notIndexedChecks(rows: IndexingRow[], pages: PageFacts[]): Finding[] {
  const byPath = new Map(pages.map((p) => [p.path, p]));
  return rows.map((r) => {
    const p = byPath.get(r.path);
    const why = !p ? "The crawl didn't reach it: no internal links point there." : !isIndexable(p) ? `Expected: the crawl saw ${p.status}${p.noindex ? ", noindex" : ""}${p.canonical && pathOf(p.canonical) !== p.path ? `, canonical ${pathOf(p.canonical)}` : ""}.` : `Indexable in the crawl (${p.words} words, ${p.links.length} links out). Strengthen the content and internal links, then request indexing.`;
    return finding("not-indexed", p && isIndexable(p) ? "high" : "low", r.path, `Google: ${r.reason}. ${why}`);
  });
}

/** Pages that start visits but never lead to a free audit. */
export function landingChecks(rows: LandingRow[], minEntries = 20): Finding[] {
  return rows
    .filter((r) => r.entries >= minEntries && r.audits === 0)
    .map((r) => finding("conversion", "medium", r.path, `${r.entries} visits started here in 28 days and none ran the free audit. Check the page has a clear next step.`));
}

const RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => RANK[a.severity] - RANK[b.severity] || a.check.localeCompare(b.check) || a.path.localeCompare(b.path));
}
