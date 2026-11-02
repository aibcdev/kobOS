/**
 * Reads every Search Console CSV in seo/gsc/raw, writes seo/gsc/shortlist.csv and prints the top 25.
 * Usage: npm run seo:shortlist -- [--min-impr 20] [--max-ctr 0.02] [--min-words 8]
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { rowsFromCsv, shortlist, SHORTLIST_DEFAULTS, toCsv } from "../lib/seo/gsc-shortlist";

const RAW = join(process.cwd(), "seo/gsc/raw");
const OUT = join(process.cwd(), "seo/gsc/shortlist.csv");

function flag(name: string, fallback: number): number {
  const i = process.argv.indexOf(name);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
}

const files = readdirSync(RAW).filter((f) => f.toLowerCase().endsWith(".csv"));
if (!files.length) {
  console.error("No CSVs in seo/gsc/raw. Export the Queries tab from Search Console first (see seo/REPORT.md).");
  process.exit(1);
}

const rows = files.flatMap((f) => rowsFromCsv(readFileSync(join(RAW, f), "utf8")));
const out = shortlist(rows, {
  minImpressions: flag("--min-impr", SHORTLIST_DEFAULTS.minImpressions),
  maxCtr: flag("--max-ctr", SHORTLIST_DEFAULTS.maxCtr),
  minWords: flag("--min-words", SHORTLIST_DEFAULTS.minWords),
});
writeFileSync(OUT, toCsv(out));

console.log(`${rows.length} rows from ${files.length} file(s), ${out.length} kept. Wrote seo/gsc/shortlist.csv\n`);
for (const r of out.slice(0, 25)) {
  console.log(
    `${r.score.toFixed(0).padStart(6)}  c${r.clusterId}  ${r.impressions} impr, pos ${r.position.toFixed(1)}  ${r.query}${r.page ? `  -> ${r.page}` : ""}`,
  );
}
if (out.length < 10) console.log("\nFewer than 10 rows. Try --min-words 5, or a Bing Webmaster Tools export.");
