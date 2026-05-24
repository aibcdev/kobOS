#!/usr/bin/env node
/**
 * Compares lib/marketing/copy.ts hero lines to the latest Owner crawl home page.
 * Run after: npm run crawl:owner:free
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CRAWL_DIR = path.join(ROOT, "downloads", "owner-crawl");
const COPY_FILE = path.join(ROOT, "lib", "marketing", "copy.ts");

function latestCrawlDir() {
  if (!fs.existsSync(CRAWL_DIR)) return null;
  const dirs = fs
    .readdirSync(CRAWL_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{8}-\d{4}$/.test(d.name))
    .map((d) => d.name)
    .sort();
  return dirs.length ? path.join(CRAWL_DIR, dirs.at(-1)) : null;
}

function normalize(s) {
  return s
    .replace(/\u2019/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const copySrc = fs.readFileSync(COPY_FILE, "utf8");
const losingMatch = copySrc.match(/losingSalesOnline:\s*"([^"]+)"/);
const useAiMatch = copySrc.match(/useAiToFix:\s*"([^"]+)"/);
if (!losingMatch || !useAiMatch) {
  console.error("Could not read marketingCopy headlines from", COPY_FILE);
  process.exit(1);
}

const ourLosing = losingMatch[1];
const ourAi = useAiMatch[1];
const expectedCombined = normalize(`${ourLosing} ${ourAi}`);

const crawlDir = latestCrawlDir();
if (!crawlDir) {
  console.warn("No crawl folder in downloads/owner-crawl — run: npm run crawl:owner:free");
  process.exit(0);
}

const homeJson = path.join(crawlDir, "pages", "home.json");
if (!fs.existsSync(homeJson)) {
  console.warn("Missing", homeJson);
  process.exit(1);
}

const home = JSON.parse(fs.readFileSync(homeJson, "utf8"));
const ownerH1 = normalize((home.h1 ?? []).join(" "));
const ok = ownerH1.includes(normalize(ourLosing.replace(/\.$/, ""))) && ownerH1.includes(normalize(ourAi.replace(/\.$/, "")));

console.log("Crawl:", path.basename(crawlDir));
console.log("Owner H1:", (home.h1 ?? [])[0] ?? "(none)");
console.log("KOB losingSalesOnline:", ourLosing);
console.log("KOB useAiToFix:", ourAi);
console.log(ok ? "OK — hero copy matches Owner crawl." : "WARN — hero copy drifted from Owner home H1. Update lib/marketing/copy.ts or re-crawl.");
process.exit(ok ? 0 : 2);
