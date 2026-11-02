/**
 * Long-question shortlist from Search Console CSV exports (seo/gsc/raw).
 * Keeps queries people already see KOB for but rarely click, scores them, and groups near-duplicates.
 */

export type GscRow = {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  /** 0–1 */
  ctr: number;
  position: number;
};

export type ShortlistRow = GscRow & { score: number; clusterId: number };

export type ShortlistOptions = { minImpressions: number; maxCtr: number; minWords: number };

export const SHORTLIST_DEFAULTS: ShortlistOptions = { minImpressions: 20, maxCtr: 0.02, minWords: 8 };

/** Quote-aware CSV split. Search Console exports quote any query that contains a comma. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

function headerIndex(header: string[], names: string[]): number {
  const norm = header.map((h) => h.replace(/^﻿/, "").trim().toLowerCase());
  return norm.findIndex((h) => names.includes(h));
}

function num(raw: string | undefined): number {
  const n = Number((raw ?? "").replace(/[%,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Reads a Queries export ("Top queries", Clicks, Impressions, CTR, Position) or an API/Looker export that also has a
 * page column. Returns [] for files without a query column, such as the Pages tab.
 */
export function rowsFromCsv(text: string): GscRow[] {
  const [header, ...body] = parseCsv(text);
  if (!header) return [];
  const q = headerIndex(header, ["top queries", "query", "queries"]);
  if (q < 0) return [];
  const p = headerIndex(header, ["page", "top pages", "landing page", "url"]);
  const c = headerIndex(header, ["clicks"]);
  const i = headerIndex(header, ["impressions"]);
  const r = headerIndex(header, ["ctr"]);
  const pos = headerIndex(header, ["position", "average position"]);
  return body.map((cells) => {
    const ctrRaw = cells[r] ?? "";
    const ctr = num(ctrRaw);
    return {
      query: (cells[q] ?? "").trim(),
      page: p >= 0 ? (cells[p] ?? "").trim() : "",
      clicks: num(cells[c]),
      impressions: num(cells[i]),
      ctr: ctrRaw.includes("%") || ctr > 1 ? Math.round(ctr * 1e4) / 1e6 : ctr,
      position: num(cells[pos]),
    };
  });
}

export function wordCount(query: string): number {
  return query.trim().split(/\s+/).filter(Boolean).length;
}

export function positionWeight(position: number): number {
  if (position <= 10) return 1;
  if (position <= 20) return 0.7;
  return 0.4;
}

export function score(row: Pick<GscRow, "impressions" | "ctr" | "position">): number {
  return row.impressions * (1 - row.ctr) * positionWeight(row.position);
}

export function tokens(query: string): Set<string> {
  return new Set(
    query
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter(Boolean),
  );
}

/** Jaccard overlap of the two word sets. */
export function similarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  const union = ta.size + tb.size - shared;
  return union ? shared / union : 0;
}

/** Same query from several files (e.g. a Queries tab plus a per-page export): keep the row that names a page. */
function dedupe(rows: GscRow[]): GscRow[] {
  const byQuery = new Map<string, GscRow>();
  for (const row of rows) {
    const key = `${row.query.toLowerCase()}\u0000${row.page}`;
    const prev = byQuery.get(key);
    if (!prev || row.impressions > prev.impressions) byQuery.set(key, row);
  }
  const named = new Set([...byQuery.values()].filter((r) => r.page).map((r) => r.query.toLowerCase()));
  return [...byQuery.values()].filter((r) => r.page || !named.has(r.query.toLowerCase()));
}

export function shortlist(rows: GscRow[], options: Partial<ShortlistOptions> = {}): ShortlistRow[] {
  const opts = { ...SHORTLIST_DEFAULTS, ...options };
  const kept = dedupe(rows)
    .filter((r) => wordCount(r.query) >= opts.minWords && r.impressions >= opts.minImpressions && r.ctr <= opts.maxCtr)
    .map((r) => ({ ...r, score: score(r), clusterId: 0 }))
    .sort((a, b) => b.score - a.score);

  // Highest-scoring query in a group names the cluster; later ones join the first cluster they match.
  const leaders: ShortlistRow[] = [];
  for (const row of kept) {
    const leader = leaders.find((l) => similarity(l.query, row.query) >= 0.8);
    if (leader) row.clusterId = leader.clusterId;
    else {
      row.clusterId = leaders.length + 1;
      leaders.push(row);
    }
  }
  return kept;
}

export function toCsv(rows: ShortlistRow[]): string {
  const esc = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const lines = rows.map((r) =>
    [r.query, r.page, r.impressions, r.clicks, r.ctr.toFixed(4), r.position.toFixed(1), r.score.toFixed(1), r.clusterId]
      .map(esc)
      .join(","),
  );
  return ["query,page,impressions,clicks,ctr,position,score,cluster_id", ...lines].join("\n") + "\n";
}
