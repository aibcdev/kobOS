/**
 * Open-source-style website email scraper (pattern from email-scrape / PeterM45).
 * Crawls homepage + contact/about pages — no paid API.
 */

import { isValidProspectEmail } from "@/lib/outbound/validate-prospect-email";

const MAILTO_RE = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const HREF_RE = /href=["']([^"']+)["']/gi;

const CONTACT_KEYWORDS = [
  "contact",
  "about",
  "team",
  "reach",
  "enquir",
  "reserv",
  "book",
];

const COMMON_PATHS = ["/contact", "/contact-us", "/about", "/about-us", "/get-in-touch"];

const PREFERRED_PREFIX =
  /^(info|hello|contact|enquiries|enquiry|sales|bookings|office|admin|reservations)@/;

type EmailCandidate = { email: string; score: number };

function scoreEmail(email: string, source: "mailto" | "text"): number {
  let score = source === "mailto" ? 100 : 50;
  const lower = email.toLowerCase();
  if (PREFERRED_PREFIX.test(lower)) score += 30;
  for (const kw of CONTACT_KEYWORDS) {
    if (lower.includes(kw)) score += 10;
  }
  return score;
}

function extractFromHtml(html: string): EmailCandidate[] {
  const byEmail = new Map<string, EmailCandidate>();

  const add = (raw: string, source: "mailto" | "text") => {
    const email = raw.trim().toLowerCase();
    if (!email.includes("@")) return;
    const candidate = { email, score: scoreEmail(email, source) };
    const existing = byEmail.get(email);
    if (!existing || candidate.score > existing.score) byEmail.set(email, candidate);
  };

  let m: RegExpExecArray | null;
  MAILTO_RE.lastIndex = 0;
  while ((m = MAILTO_RE.exec(html)) !== null) add(m[1]!, "mailto");

  for (const email of html.match(EMAIL_RE) ?? []) add(email, "text");

  return [...byEmail.values()];
}

function discoverContactUrls(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const found = new Set<string>();

  for (const path of COMMON_PATHS) {
    try {
      found.add(new URL(path, base).toString());
    } catch {
      /* ignore */
    }
  }

  let match: RegExpExecArray | null;
  HREF_RE.lastIndex = 0;
  while ((match = HREF_RE.exec(html)) !== null) {
    const href = match[1]?.trim();
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) continue;
    const lower = href.toLowerCase();
    if (!CONTACT_KEYWORDS.some((kw) => lower.includes(kw))) continue;
    try {
      const url = new URL(href, base);
      if (url.hostname !== base.hostname) continue;
      url.hash = "";
      found.add(url.toString());
    } catch {
      /* ignore */
    }
  }

  return [...found].slice(0, 6);
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url.startsWith("http") ? url : `https://${url}`, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "KOB-LeadEngine/1.0 (+https://trykob.com)" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function scrapeWebsiteEmail(websiteUrl: string): Promise<string | null> {
  const normalized = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`;
  const homepage = await fetchHtml(normalized);
  if (!homepage) return null;

  const pages = [normalized, ...discoverContactUrls(homepage, normalized)];
  const candidates: EmailCandidate[] = [];

  for (const pageUrl of pages) {
    const html = pageUrl === normalized ? homepage : await fetchHtml(pageUrl);
    if (!html) continue;
    candidates.push(...extractFromHtml(html));
  }

  const ranked = candidates
    .filter((c) => isValidProspectEmail(c.email, websiteUrl).ok)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.email ?? null;
}
