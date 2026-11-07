import { prisma } from "@/lib/db/prisma";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Marketing page views, counted per day, page and source. No cookies, no IP, no visitor id, so it needs no consent
 * banner. Bots, previews and local dev don't count.
 */

/** Signed-in areas and plumbing. Only public pages are counted. */
const NOT_COUNTED = /^\/(app|dashboard|ops|api|auth|login|logout|signup|onboard|settings|_next)(\/|$)/;

/** Per-restaurant pages collapse to one row each, so the table stays small. */
const COLLAPSE: [RegExp, string][] = [
  [/^\/audit\/[^/]+(\/.*)?$/, "/audit/[slug]"],
  [/^\/audit-reviews\/[^/]+(\/.*)?$/, "/audit-reviews/[slug]"],
  [/^\/review\/[^/]+(\/.*)?$/, "/review/[slug]"],
];

export function visitPath(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) return null;
  let path = raw.split(/[?#]/)[0].toLowerCase();
  if (path.length > 1) path = path.replace(/\/+$/, "");
  if (!path || path.length > 120 || NOT_COUNTED.test(path)) return null;
  if (!/^\/[a-z0-9\-._~/[\]]*$/.test(path)) return null;
  for (const [re, label] of COLLAPSE) if (re.test(path)) return label;
  return path;
}

/** Referrer hosts grouped the way we talk about them. First match wins, so gemini sits above google. */
const REFERRER_BUCKETS: [RegExp, string][] = [
  [/(^|\.)gemini\.google\.com$/, "gemini"],
  [/(^|\.)google\.[a-z.]+$/, "google"],
  [/(^|\.)bing\.com$/, "bing"],
  [/(^|\.)duckduckgo\.com$/, "duckduckgo"],
  [/(^|\.)(chatgpt\.com|chat\.openai\.com)$/, "chatgpt"],
  [/(^|\.)perplexity\.ai$/, "perplexity"],
  [/(^|\.)claude\.ai$/, "claude"],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, "linkedin"],
  [/(^|\.)(x\.com|twitter\.com|t\.co)$/, "x"],
  [/(^|\.)(facebook\.com|fb\.com)$/, "facebook"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
  [/(^|\.)reddit\.com$/, "reddit"],
];

export type VisitSourceInput = { entry: boolean; referrer?: unknown; utmSource?: unknown };

export function visitSource(input: VisitSourceInput, ownHosts: string[]): string {
  if (!input.entry) return "internal";
  if (typeof input.utmSource === "string") {
    const utm = input.utmSource.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 40);
    if (utm) return utm;
  }
  if (typeof input.referrer !== "string" || !input.referrer) return "direct";
  let host: string;
  try {
    host = new URL(input.referrer).hostname.toLowerCase();
  } catch {
    return "direct";
  }
  if (ownHosts.includes(host)) return "direct";
  for (const [re, bucket] of REFERRER_BUCKETS) if (re.test(host)) return bucket;
  return host.replace(/^www\./, "").slice(0, 60);
}

export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return true;
  return /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|python|curl|wget|httpclient|monitor|uptime|playwright|puppeteer/i.test(
    userAgent,
  );
}

/** trykob.com and www.trykob.com, from NEXT_PUBLIC_SITE_URL. Empty for localhost unless VISITS_ALLOW_LOCAL=1. */
export function countedHosts(siteUrl: string = getSiteUrl(), allowLocal = process.env.VISITS_ALLOW_LOCAL === "1"): string[] {
  let host: string;
  try {
    host = new URL(siteUrl).hostname.toLowerCase();
  } catch {
    return [];
  }
  if (!allowLocal && (host === "localhost" || host === "127.0.0.1")) return [];
  const bare = host.replace(/^www\./, "");
  return [bare, `www.${bare}`];
}

/** Only beacons sent from a page on the production host count, so previews and other sites don't. */
export function fromCountedHost(origin: string | null, hosts: string[]): boolean {
  if (!origin || !hosts.length) return false;
  try {
    return hosts.includes(new URL(origin).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function utcDay(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function recordVisit(path: string, source: string, entry: boolean, now: Date = new Date()): Promise<void> {
  const day = utcDay(now);
  const entries = entry ? 1 : 0;
  await prisma.siteVisitDay.upsert({
    where: { day_path_source: { day, path, source } },
    create: { day, path, source, views: 1, entries },
    update: { views: { increment: 1 }, entries: { increment: entries } },
  });
}
