/**
 * Follows every sitemap URL, every our_url in data/link-log.csv and the host variants (http, www) one hop at a time.
 * Fails on more than one redirect or a final status other than 200.
 *
 *   npm run links:redirects                               # https://trykob.com
 *   npm run links:redirects -- https://deploy-preview-63--trykob.netlify.app
 *
 * URLs on trykob.com are checked against the base you pass, so a preview can be audited before it ships.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { readLinkLog, redirectProblem } from "../lib/marketing/link-log";

const UA = "kob-redirect-audit/1.0 (+https://trykob.com/press)";
const MAX_HOPS = 5;

async function hops(start: string) {
  const out: Array<{ url: string; status: number }> = [];
  let url = start;
  for (let i = 0; i <= MAX_HOPS; i++) {
    // HEAD first; some hosts answer HEAD badly, so fall back to GET.
    let res = await fetch(url, { method: "HEAD", redirect: "manual", headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20_000) });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { redirect: "manual", headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20_000) });
    }
    out.push({ url, status: res.status });
    const next = res.headers.get("location");
    if (res.status < 300 || res.status >= 400 || !next) break;
    url = new URL(next, url).toString();
  }
  return out;
}

async function main() {
  const base = (process.argv[2] || "https://trykob.com").replace(/\/$/, "");
  const onBase = (u: string) => {
    const parsed = new URL(u, base);
    return /(^|\.)trykob\.com$/.test(parsed.hostname) ? `${base}${parsed.pathname}${parsed.search}` : parsed.toString();
  };

  const sitemap = await (await fetch(`${base}/sitemap.xml`, { headers: { "User-Agent": UA } })).text();
  const urls = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => onBase(m[1].trim())));
  const { rows } = readLinkLog(readFileSync(path.join(process.cwd(), "data/link-log.csv"), "utf8"));
  for (const r of rows) if (r.our_url) urls.add(onBase(r.our_url));
  if (base === "https://trykob.com") {
    for (const u of ["http://trykob.com/", "http://www.trykob.com/", "https://www.trykob.com/", "https://www.trykob.com/pricing"]) urls.add(u);
  }

  const failures: string[] = [];
  for (const url of urls) {
    const chain = await hops(url).catch((e: unknown) => [{ url, status: 0, error: String(e) }]);
    const problem = redirectProblem(chain);
    console.log(`${problem ? "FAIL" : "ok  "} ${url}${problem ? `  ${problem}` : chain.length > 1 ? `  → ${chain[chain.length - 1].url}` : ""}`);
    if (problem) failures.push(`${url}: ${problem}`);
  }
  console.log(`\n${urls.size} URL(s), ${failures.length} problem(s)`);
  if (failures.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
