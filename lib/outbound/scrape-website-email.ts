/**
 * Restaurant email scraper — contact pages first, then homepage/footer,
 * then Facebook About when the site is down or empty.
 */

import { hostFromWebsiteUrl } from "@/lib/outbound/chain-denylist";
import { isValidProspectEmail } from "@/lib/outbound/validate-prospect-email";

const MAILTO_RE = /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi;
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/gi;
const HREF_RE = /href=["']([^"']+)["']/gi;
const JSON_LD_RE = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

/** Contact paths first — independents often only list email there. */
const CONTACT_PATHS = [
  "/contact",
  "/contact-us",
  "/contactus",
  "/get-in-touch",
  "/getintouch",
  "/about",
  "/about-us",
  "/find-us",
  "/location",
  "/en/contact",
];

const CONTACT_LINK_KEYWORDS = ["contact", "about", "team", "reach", "enquir", "reserv", "find-us", "findus"];

const BLACKLIST_DOMAINS = new Set([
  "example.com",
  "domain.com",
  "email.com",
  "sentry.io",
  "wixpress.com",
  "wordpress.com",
  "godaddy.com",
  "squarespace.com",
  "shopify.com",
  "google.com",
  "schema.org",
  "w3.org",
  "cloudflare.com",
  "sentry-next.wixpress.com",
]);

const BLACKLIST_LOCAL = new Set([
  "noreply",
  "no-reply",
  "donotreply",
  "mailer-daemon",
  "privacy",
  "abuse",
  "postmaster",
]);

const GOOD_LOCAL = ["info", "contact", "hello", "enquiries", "enquiry", "bookings", "reservations", "office", "admin"];

export type ScrapeEmailOptions = {
  businessName?: string | null;
  /** Known Facebook page URL — used when website is 503 / empty. */
  facebookUrl?: string | null;
};

type FetchResult = { html: string | null; status: number | null; finalUrl: string };

function websiteDomain(baseUrl: string): string {
  try {
    return new URL(baseUrl).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return hostFromWebsiteUrl(baseUrl) ?? "";
  }
}

function nameToken(businessName: string): string {
  return businessName.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function extractEmailsFromText(text: string): string[] {
  if (!text) return [];
  const found = text.match(EMAIL_RE) ?? [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of found) {
    const email = raw.trim().toLowerCase();
    if (seen.has(email)) continue;
    // Skip image/asset false positives
    if (/\.(png|jpe?g|gif|webp|svg)$/i.test(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

export function isGoodEmailCandidate(email: string): boolean {
  const trimmed = email.toLowerCase().trim();
  if ((trimmed.match(/@/g) ?? []).length !== 1) return false;
  const [local, domain] = trimmed.split("@");
  if (!local || !domain || local.length < 2) return false;
  if (BLACKLIST_DOMAINS.has(domain)) return false;
  const root = domain.split(".").slice(-2).join(".");
  if (BLACKLIST_DOMAINS.has(root)) return false;
  if (BLACKLIST_LOCAL.has(local)) return false;
  if (domain.includes("sentry") || domain.includes("wixpress")) return false;
  if (/^[a-f0-9]{24,}$/.test(local)) return false;
  return true;
}

/** Higher = more likely real owner / bookings inbox. */
export function scoreRestaurantEmail(
  email: string,
  businessName: string,
  siteDomain: string,
): number {
  const lower = email.toLowerCase();
  const [local, domain] = lower.split("@");
  if (!local || !domain) return -100;
  let score = 0;

  const site = siteDomain.replace(/^www\./i, "").toLowerCase();
  if (site && (domain === site || domain.endsWith(`.${site}`) || site.endsWith(`.${domain}`))) {
    score += 50;
  }

  const clean = nameToken(businessName);
  if (clean.length >= 4 && clean.slice(0, 6) && local.includes(clean.slice(0, Math.min(6, clean.length)))) {
    score += 30;
  } else if (clean.length >= 4) {
    // Partial: anatolia + coventry style gmail
    const chunks = clean.match(/.{4,8}/g) ?? [];
    if (chunks.some((c) => local.includes(c))) score += 20;
  }

  if (GOOD_LOCAL.some((p) => local === p || local.startsWith(`${p}.`) || local.startsWith(`${p}-`))) {
    score += 15;
  }

  // Gmail/Yahoo still fine for independents
  if (["gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "hotmail.com", "hotmail.co.uk", "outlook.com"].includes(domain)) {
    score += 5;
  }

  // mailto links are intentional
  return score;
}

function extractJsonLdEmails(html: string): string[] {
  const emails: string[] = [];
  JSON_LD_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = JSON_LD_RE.exec(html)) !== null) {
    const block = m[1] ?? "";
    emails.push(...extractEmailsFromText(block));
    // email fields often as "email":"x@y.com"
    const field = block.match(/"email"\s*:\s*"([^"]+)"/gi) ?? [];
    for (const f of field) {
      const v = f.split(":").slice(1).join(":").replace(/"/g, "").trim();
      if (v.includes("@")) emails.push(v.toLowerCase());
    }
  }
  return emails;
}

function extractFromHtml(html: string): string[] {
  const emails: string[] = [];

  MAILTO_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MAILTO_RE.exec(html)) !== null) {
    if (m[1]) emails.push(m[1].toLowerCase());
  }

  emails.push(...extractEmailsFromText(html));
  emails.push(...extractJsonLdEmails(html));
  return [...new Set(emails)];
}

function discoverContactUrlsFromHtml(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const found: string[] = [];
  const seen = new Set<string>();

  const add = (url: string) => {
    if (seen.has(url)) return;
    seen.add(url);
    found.push(url);
  };

  let match: RegExpExecArray | null;
  HREF_RE.lastIndex = 0;
  while ((match = HREF_RE.exec(html)) !== null) {
    const href = match[1]?.trim();
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) continue;
    const lower = href.toLowerCase();
    if (!CONTACT_LINK_KEYWORDS.some((kw) => lower.includes(kw))) continue;
    try {
      const url = new URL(href, base);
      if (url.hostname !== base.hostname) continue;
      url.hash = "";
      add(url.toString());
    } catch {
      /* ignore */
    }
  }
  return found.slice(0, 4);
}

function contactUrlsForSite(baseUrl: string): string[] {
  const out: string[] = [];
  for (const path of CONTACT_PATHS) {
    try {
      out.push(new URL(path, baseUrl).toString());
    } catch {
      /* ignore */
    }
  }
  return out;
}

function findFacebookUrl(html: string): string | null {
  const m = html.match(/https?:\/\/(?:www\.)?facebook\.com\/[^\s"'<>]+/i);
  return m?.[0]?.replace(/[.,;)]+$/, "") ?? null;
}

async function fetchHtml(url: string): Promise<FetchResult> {
  const target = url.startsWith("http") ? url : `https://${url}`;
  try {
    const res = await fetch(target, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; KOB-LeadEngine/1.1; +https://trykob.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) return { html: null, status: res.status, finalUrl: res.url || target };
    return { html: await res.text(), status: res.status, finalUrl: res.url || target };
  } catch {
    return { html: null, status: null, finalUrl: target };
  }
}

function rankEmails(
  candidates: string[],
  businessName: string,
  siteDomain: string,
  websiteUrl: string,
): string[] {
  const good = candidates.filter((e) => isGoodEmailCandidate(e));
  const validated = good.filter((e) => isValidProspectEmail(e, websiteUrl).ok);
  const pool = validated.length ? validated : good;
  return [...pool].sort(
    (a, b) => scoreRestaurantEmail(b, businessName, siteDomain) - scoreRestaurantEmail(a, businessName, siteDomain),
  );
}

async function scrapeFacebookAboutEmail(
  facebookUrl: string,
  businessName: string,
  websiteUrl: string,
): Promise<string | null> {
  // Try About tab variants — public pages sometimes expose email in HTML
  const bases = [facebookUrl.replace(/\/$/, "")];
  const aboutUrls = bases.flatMap((b) => [`${b}/about`, `${b}/about_contact_and_basic_info`, b]);

  const all: string[] = [];
  for (const url of aboutUrls.slice(0, 3)) {
    const page = await fetchHtml(url);
    if (!page.html) continue;
    all.push(...extractFromHtml(page.html));
  }
  if (!all.length) return null;
  const ranked = rankEmails(all, businessName, "", websiteUrl);
  // Prefer gmail/personal that embeds business name (anatoliacoventry@…)
  return ranked[0] ?? null;
}

/**
 * Find the best contact email for a restaurant website.
 * Order: /contact* → homepage → footer links → Facebook About (if site down).
 */
export async function scrapeWebsiteEmail(
  websiteUrl: string,
  options?: ScrapeEmailOptions,
): Promise<string | null> {
  const normalized = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`;
  const businessName = options?.businessName?.trim() || "";
  const siteDomain = websiteDomain(normalized);
  const allEmails: string[] = [];
  let homepageHtml: string | null = null;
  let siteDown = false;
  let facebookUrl = options?.facebookUrl?.trim() || null;

  // 1. Contact paths FIRST (before homepage)
  for (const contactUrl of contactUrlsForSite(normalized)) {
    const page = await fetchHtml(contactUrl);
    if (page.status === 503 || page.status === 502 || page.status === 521) siteDown = true;
    if (!page.html) continue;
    allEmails.push(...extractFromHtml(page.html));
    if (!facebookUrl) facebookUrl = findFacebookUrl(page.html);
  }

  // 2. Homepage
  const home = await fetchHtml(normalized);
  if (home.status === 503 || home.status === 502 || home.status === 521 || home.status === 500) {
    siteDown = true;
  }
  homepageHtml = home.html;
  if (homepageHtml) {
    allEmails.push(...extractFromHtml(homepageHtml));
    if (!facebookUrl) facebookUrl = findFacebookUrl(homepageHtml);

    // 3. Extra contact links discovered from homepage (footer etc.)
    for (const extra of discoverContactUrlsFromHtml(homepageHtml, normalized)) {
      if (CONTACT_PATHS.some((p) => extra.toLowerCase().includes(p.replace(/^\//, "")))) continue;
      const page = await fetchHtml(extra);
      if (!page.html) continue;
      allEmails.push(...extractFromHtml(page.html));
      if (!facebookUrl) facebookUrl = findFacebookUrl(page.html);
    }
  } else {
    siteDown = true;
  }

  const ranked = rankEmails(allEmails, businessName, siteDomain, normalized);
  if (ranked[0]) return ranked[0];

  // 4. Website failed / no email → Facebook About
  if ((siteDown || allEmails.length === 0) && facebookUrl) {
    const fromFb = await scrapeFacebookAboutEmail(facebookUrl, businessName, normalized);
    if (fromFb) return fromFb;
  }

  return null;
}

/** @deprecated use scrapeWebsiteEmail(url, { businessName }) */
export async function scrapeWebsiteEmailWithName(
  websiteUrl: string,
  businessName: string,
): Promise<string | null> {
  return scrapeWebsiteEmail(websiteUrl, { businessName });
}
