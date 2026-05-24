import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const SITEMAP_URL = "https://www.owner.com/sitemap.xml";
export const DEFAULT_MAX = 30;

export const SEED_URLS = [
  "https://www.owner.com/",
  "https://www.owner.com/pricing",
  "https://www.owner.com/demo",
  "https://www.owner.com/restaurant-website-ai",
  "https://www.owner.com/online-ordering",
  "https://www.owner.com/delivery",
];

export type PageMeta = {
  method: "fetch" | "browserbase";
  url: string;
  finalUrl: string;
  statusCode: number | null;
  title: string | null;
  metaDescription: string | null;
  h1: string[];
  htmlBytes: number;
  internalLinkCount: number;
  error?: string;
};

export function parseArgs(argv: string[]) {
  let max = Number(process.env.OWNER_CRAWL_MAX ?? DEFAULT_MAX);
  let dryRun = false;
  let singleUrl: string | null = null;
  let free = false;
  for (const arg of argv) {
    if (arg === "--dry-run") dryRun = true;
    else if (arg === "--free") free = true;
    else if (arg.startsWith("--max=")) max = Math.max(1, Number(arg.slice(6)) || DEFAULT_MAX);
    else if (arg.startsWith("--url=")) singleUrl = arg.slice(6).trim();
  }
  return { max, dryRun, singleUrl, free };
}

export function slugFromUrl(url: string): string {
  try {
    const p = new URL(url).pathname.replace(/\/$/, "") || "/";
    if (p === "/") return "home";
    return p
      .slice(1)
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 120);
  } catch {
    return "page";
  }
}

export function hostAllowed(url: string): boolean {
  try {
    const u = new URL(url);
    const h = u.hostname.replace(/^www\./i, "").toLowerCase();
    if (h !== "owner.com") return false;
    const path = u.pathname.toLowerCase();
    if (path.includes("/dev/") || path.includes("/test/")) return false;
    return true;
  } catch {
    return false;
  }
}

export async function fetchSitemapUrls(): Promise<string[]> {
  const res = await fetch(SITEMAP_URL, {
    headers: { "User-Agent": "KOB-OwnerCrawl/1.0" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`sitemap_http_${res.status}`);
  const xml = await res.text();
  const urls: string[] = [];
  for (const m of xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)) {
    const u = m[1]?.trim();
    if (u && hostAllowed(u)) urls.push(u);
  }
  return [...new Set(urls)];
}

export function pickUrls(all: string[], max: number): string[] {
  const priority = new Set(SEED_URLS.map((u) => u.replace(/\/$/, "") || u));
  const scored = all.map((url) => {
    const norm = url.replace(/\/$/, "") || url;
    let score = 0;
    if (priority.has(norm) || priority.has(`${norm}/`)) score += 100;
    if (!url.includes("/blog/") && !url.includes("/legal/")) score += 10;
    if (url.includes("/demo")) score += 5;
    return { url, score };
  });
  scored.sort((a, b) => b.score - a.score || a.url.localeCompare(b.url));
  return scored.slice(0, max).map((x) => x.url);
}

export function extractPageSignals(
  html: string,
  pageUrl: string,
): Pick<PageMeta, "title" | "metaDescription" | "h1" | "internalLinkCount"> {
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? null;
  const metaDescription =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1]?.trim() ??
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1]?.trim() ??
    null;
  const h1: string[] = [];
  for (const m of html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)) {
    const t = m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (t) h1.push(t);
    if (h1.length >= 5) break;
  }
  let internalLinkCount = 0;
  for (const m of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    try {
      const resolved = new URL(m[1], pageUrl);
      if (hostAllowed(resolved.href)) internalLinkCount++;
    } catch {
      /* skip */
    }
  }
  return { title, metaDescription, h1, internalLinkCount };
}

export function stampDir(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
}

export async function resolveCrawlUrls(max: number, singleUrl: string | null): Promise<string[]> {
  if (singleUrl) return [singleUrl];
  let fromSitemap: string[] = [];
  try {
    fromSitemap = await fetchSitemapUrls();
    console.log(`Sitemap: ${fromSitemap.length} owner.com URLs`);
  } catch (e) {
    console.warn("Sitemap fetch failed, using seeds only:", e instanceof Error ? e.message : e);
    fromSitemap = [...SEED_URLS];
  }
  return pickUrls(fromSitemap.length ? fromSitemap : SEED_URLS, max);
}

export function writeCrawlOutput(
  outRoot: string,
  method: "fetch" | "browserbase",
  urls: string[],
  manifest: PageMeta[],
  homeHtml: string | null,
  discoverSiblingOrigins: (pageUrl: string, html: string, max: number) => string[],
) {
  if (homeHtml) {
    const siblings = discoverSiblingOrigins("https://www.owner.com/", homeHtml, 12);
    writeFileSync(resolve(outRoot, "sibling-origins.json"), JSON.stringify(siblings, null, 2));
  }

  writeFileSync(resolve(outRoot, "manifest.json"), JSON.stringify(manifest, null, 2));

  const ok = manifest.filter((m) => !m.error).length;
  const summary = [
    "# Owner.com crawl",
    "",
    `Method: ${method} (${method === "fetch" ? "free HTTP — no Browserbase" : "Browserbase render"})`,
    `Crawled: ${ok}/${manifest.length} pages`,
    `Output: ${outRoot}`,
    "",
    "## Pages",
    "",
    ...manifest.map((m) => {
      const status = m.error ? `❌ ${m.error}` : `✅ ${m.statusCode ?? "?"}`;
      return `- [${m.title ?? slugFromUrl(m.url)}](${m.url}) — ${status}`;
    }),
  ].join("\n");
  writeFileSync(resolve(outRoot, "SUMMARY.md"), summary);

  console.log(`\nDone. ${ok}/${manifest.length} pages saved under:\n  ${outRoot}`);
  return outRoot;
}
