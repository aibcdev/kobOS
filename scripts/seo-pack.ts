/**
 * Builds the SEO data pack in seo/pack: a crawl of the site, any Search Console exports in seo/gsc/raw, landing pages
 * with conversions (when the visit counts exist), then runs lib/seo/pack-checks.ts and writes seo/pack/REPORT.md.
 * Read-only: it fetches pages and reads the database, and changes nothing.
 *
 *   npm run seo:pack -- --base http://localhost:3000     # a local `next start`
 *   npm run seo:pack -- --base https://trykob.com        # production, one request every 0.5s
 *   npm run seo:pack -- --landing                        # also read 28 days of visits and audits (DATABASE_URL)
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv, rowsFromCsv } from "../lib/seo/gsc-shortlist";
import {
  competingQueries,
  contentChecks,
  indexingChecks,
  landingChecks,
  linkChecks,
  notIndexedChecks,
  overlapChecks,
  pathOf,
  sortFindings,
  strikingDistance,
  titleChecks,
  type Finding,
  type IndexingRow,
  type LandingRow,
  type QueryPageRow,
} from "../lib/seo/pack-checks";
import { crawlSite, crawlToCsv, type PageFacts } from "../lib/seo/site-crawl";

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const BASE = arg("--base", "http://localhost:3000");
const OUT = join(process.cwd(), arg("--out", "seo/pack"));
const RAW = join(process.cwd(), "seo/gsc/raw");
const withLanding = process.argv.includes("--landing");

function header(text: string): string[] {
  return (parseCsv(text)[0] ?? []).map((h) => h.replace(/^﻿/, "").trim().toLowerCase());
}

/** Sorts each export in seo/gsc/raw by its columns: query+page, queries only, pages only, or an indexing drill-down. */
function readSearchConsole() {
  const queryPage: QueryPageRow[] = [];
  const queries: QueryPageRow[] = [];
  const impressionsByPath = new Map<string, number>();
  const indexing: IndexingRow[] = [];
  const files = existsSync(RAW) ? readdirSync(RAW).filter((f) => f.toLowerCase().endsWith(".csv")) : [];
  for (const f of files) {
    const text = readFileSync(join(RAW, f), "utf8");
    const cols = header(text);
    const rows = rowsFromCsv(text);
    if (rows.length) {
      for (const r of rows) (r.page ? queryPage : queries).push({ ...r, path: r.page ? pathOf(r.page) : "" });
      continue;
    }
    const [, ...body] = parseCsv(text);
    const pageCol = cols.findIndex((c) => c === "top pages" || c === "page");
    const imprCol = cols.indexOf("impressions");
    if (pageCol >= 0 && imprCol >= 0) {
      for (const cells of body) impressionsByPath.set(pathOf(cells[pageCol] ?? ""), Number((cells[imprCol] ?? "0").replace(/,/g, "")) || 0);
      continue;
    }
    // Indexing drill-downs ("Crawled - currently not indexed.csv" and so on) are a URL list; the file name is the reason.
    const urlCol = cols.findIndex((c) => c === "url");
    if (urlCol >= 0) {
      const reason = f.replace(/\.csv$/i, "").replace(/[_-]+/g, " ").trim();
      for (const cells of body) if (cells[urlCol]) indexing.push({ path: pathOf(cells[urlCol]), reason });
    }
  }
  // The Pages tab has the true per-page totals; summing query+page rows is the fallback when it wasn't exported.
  const fromQueries = new Map<string, number>();
  for (const r of queryPage) fromQueries.set(r.path, (fromQueries.get(r.path) ?? 0) + r.impressions);
  for (const [p, n] of fromQueries) if (!impressionsByPath.has(p)) impressionsByPath.set(p, n);
  return { files, queryPage, queries, impressionsByPath, indexing };
}

/** 28 days of visits started and visitor audits per landing page. Needs the SiteVisitDay table (PR #66). */
async function readLanding(): Promise<LandingRow[] | string> {
  if (!process.env.DATABASE_URL) return "DATABASE_URL isn't set.";
  const { prisma } = await import("../lib/db/prisma");
  try {
    const visits = await prisma.$queryRaw<{ path: string; entries: bigint }[]>`
      SELECT "path", SUM("entries") AS entries FROM "public"."SiteVisitDay"
      WHERE "day" >= (CURRENT_DATE - INTERVAL '28 days') GROUP BY "path"`;
    const audits = await prisma.$queryRaw<{ path: string; audits: bigint }[]>`
      SELECT "landingPath" AS path, COUNT(*) AS audits FROM "public"."VisibilityAudit"
      WHERE "createdAt" >= NOW() - INTERVAL '28 days' AND "origin" = 'visitor' AND "landingPath" IS NOT NULL
      GROUP BY "landingPath"`;
    const byPath = new Map(audits.map((a) => [pathOf(a.path), Number(a.audits)]));
    return visits.map((v) => ({ path: v.path, entries: Number(v.entries), audits: byPath.get(v.path) ?? 0 }));
  } catch (e) {
    return `Visit counts aren't available yet (merge PR #66 first): ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`;
  } finally {
    await prisma.$disconnect();
  }
}

/** Where to make the fix for a path. */
function fileFor(path: string): string {
  const slug = path.match(/^\/resources\/([^/]+)$/)?.[1];
  if (slug) return `lib/marketing/resources/articles.ts (slug "${slug}")`;
  if (path === "/") return "app/(marketing)/page.tsx";
  for (const f of [`app/(marketing)${path}/page.tsx`, `app${path}/page.tsx`]) if (existsSync(join(process.cwd(), f))) return f;
  return "";
}

function csv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))).join(",")).join("\n") + "\n";
}

const CHECK_TITLES: Record<string, string> = {
  indexing: "Indexing",
  "not-indexed": "Google says not indexed",
  competing: "Pages competing for the same search",
  "striking-distance": "Striking distance (positions 4–20)",
  titles: "Titles and H1s",
  descriptions: "Meta descriptions",
  wording: "Banned wording",
  links: "Internal links",
  thin: "Thin pages",
  conversion: "Visits with no audits",
  semantics: "Forms and page structure",
};

function report(pages: PageFacts[], findings: Finding[], notes: string[]): string {
  const counts = { high: 0, medium: 0, low: 0 };
  for (const f of findings) counts[f.severity]++;
  const lines = [
    "# SEO data pack: report",
    "",
    `Crawled ${BASE} on ${new Date().toISOString().slice(0, 10)}: ${pages.length} URLs. Findings: ${counts.high} high, ${counts.medium} medium, ${counts.low} low.`,
    "",
    "Built by `npm run seo:pack` (`lib/seo/pack-checks.ts`). Each finding names the file to change. Nothing here has been fixed yet.",
    "",
    ...notes.map((n) => `> ${n}`),
    "",
  ];
  const byCheck = new Map<string, Finding[]>();
  for (const f of findings) byCheck.set(f.check, [...(byCheck.get(f.check) ?? []), f]);
  const order = Object.keys(CHECK_TITLES).filter((c) => byCheck.has(c));
  for (const check of order) {
    const fs = byCheck.get(check)!;
    lines.push(`## ${CHECK_TITLES[check]} (${fs.length})`, "", "| | Page | Finding | File |", "|---|---|---|---|");
    for (const f of fs) lines.push(`| ${f.severity} | \`${f.path}\` | ${f.detail.replace(/\|/g, "\\|")} | ${fileFor(f.path)} |`);
    lines.push("");
  }
  if (!order.length) lines.push("No findings.", "");
  return lines.join("\n");
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log(`Crawling ${BASE}…`);
  const { pages, sitemap } = await crawlSite({ base: BASE, delayMs: BASE.includes("localhost") ? 0 : 500, log: (l) => console.log(l) });
  writeFileSync(join(OUT, "crawl.csv"), crawlToCsv(pages));

  const notes: string[] = [];
  const gsc = readSearchConsole();
  if (!gsc.files.length) notes.push("No Search Console exports in seo/gsc/raw yet, so the competing-query, striking-distance and not-indexed checks didn't run. Title overlap stands in for competing pages. See seo/pack/README.md.");
  else if (!gsc.queryPage.length) notes.push("Search Console exports have no query+page file, so competing queries and striking distance didn't run. See seo/pack/README.md.");
  writeFileSync(join(OUT, "gsc-query-page.csv"), csv([["query", "path", "impressions", "clicks", "ctr", "position"], ...gsc.queryPage.map((r) => [r.query, r.path, r.impressions, r.clicks, r.ctr, r.position])]));
  writeFileSync(join(OUT, "gsc-queries.csv"), csv([["query", "impressions", "clicks", "ctr", "position"], ...gsc.queries.map((r) => [r.query, r.impressions, r.clicks, r.ctr, r.position])]));
  writeFileSync(join(OUT, "gsc-pages.csv"), csv([["path", "impressions"], ...[...gsc.impressionsByPath].map(([p, n]) => [p, n])]));
  writeFileSync(join(OUT, "gsc-indexing.csv"), csv([["path", "reason"], ...gsc.indexing.map((r) => [r.path, r.reason])]));

  let landing: LandingRow[] = [];
  if (withLanding) {
    const result = await readLanding();
    if (typeof result === "string") notes.push(`Landing pages skipped: ${result}`);
    else {
      landing = result;
      writeFileSync(join(OUT, "landing.csv"), csv([["path", "entries_28d", "visitor_audits_28d"], ...landing.map((r) => [r.path, r.entries, r.audits])]));
    }
  } else notes.push("Landing pages and conversions skipped. Run with --landing once PR #66 is live.");

  const findings = sortFindings([
    ...indexingChecks(pages, sitemap),
    ...notIndexedChecks(gsc.indexing, pages),
    ...(gsc.queryPage.length ? competingQueries(gsc.queryPage) : overlapChecks(pages)),
    ...strikingDistance(gsc.queryPage),
    ...titleChecks(pages),
    ...contentChecks(pages),
    ...linkChecks(pages, gsc.impressionsByPath),
    ...landingChecks(landing),
  ]);
  writeFileSync(join(OUT, "REPORT.md"), report(pages, findings, notes));
  console.log(`\n${pages.length} URLs, ${findings.length} findings. Wrote ${OUT}/REPORT.md`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
