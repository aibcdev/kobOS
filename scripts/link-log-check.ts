/**
 * Rechecks every live link in data/link-log.csv: does the page still link to trykob.com? Prints the ones that don't,
 * so they can be recovered. Polite: obeys robots.txt, one request a second, and says who it is.
 *
 *   npm run links:check
 *
 * Exits 1 when the log has problems or a live link has gone.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { linksTo, readLinkLog, robotsAllows } from "../lib/marketing/link-log";

const UA = "kob-link-check/1.0 (+https://trykob.com/press; hello@trykob.com)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string) {
  return fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: AbortSignal.timeout(20_000) });
}

async function main() {
  const { rows, problems } = readLinkLog(readFileSync(path.join(process.cwd(), "data/link-log.csv"), "utf8"));
  for (const p of problems) console.error(`log: ${p}`);
  const live = rows.filter((r) => r.status === "live" && r.live_link_url);
  console.log(`${live.length} live link(s) to check`);
  const robots = new Map<string, string>();
  const missing: string[] = [];
  for (const row of live) {
    const url = new URL(row.live_link_url);
    if (!robots.has(url.origin)) {
      const res = await get(`${url.origin}/robots.txt`).catch(() => null);
      robots.set(url.origin, res?.ok ? await res.text() : "");
      await sleep(1000);
    }
    if (!robotsAllows(robots.get(url.origin)!, url.pathname)) {
      console.log(`skip (robots.txt): ${row.live_link_url}`);
      continue;
    }
    const res = await get(row.live_link_url).catch((e: unknown) => ({ ok: false, status: String(e) }) as const);
    const ok = res.ok && "text" in res && linksTo(await res.text());
    console.log(`${ok ? "ok  " : "GONE"} ${row.live_link_url}${ok ? "" : ` (${res.status})`}`);
    if (!ok) missing.push(`${row.live_link_url} (${row.type}, contact: ${row.contact || "none"})`);
    await sleep(1000);
  }
  if (missing.length) {
    console.log(`\nLinks to recover:\n- ${missing.join("\n- ")}`);
  }
  if (missing.length || problems.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
