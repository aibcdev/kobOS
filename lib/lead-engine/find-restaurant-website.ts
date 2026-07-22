import { resolveJustEatMenuPath } from "@/lib/lead-engine/justeat-menu-url";
import type { GoogleEnrichedLead } from "@/lib/lead-engine/google-enrich";
import type { MergedPlatformLead } from "@/lib/lead-engine/merge-platform-listings";
import { extractNextDataJson, fetchHtml } from "@/lib/lead-engine/scrapers/fetch-html";
import { isValidProspectEmail } from "@/lib/outbound/validate-prospect-email";
import { randomUUID } from "node:crypto";

export type PlatformPageContact = {
  websiteUrl: string | null;
  phoneNumber: string | null;
  contactEmail: string | null;
};

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const BLOCKED_HOSTS =
  /just-eat|justeat|deliveroo|ubereats|facebook|instagram|twitter|tripadvisor|google\.|apple\.com\/maps/i;

function pickExternalWebsite(html: string): string | null {
  const hrefs = [...html.matchAll(/href=["'](https?:\/\/[^"'#]+)["']/gi)].map((m) => m[1]!);
  for (const href of hrefs) {
    try {
      const host = new URL(href).hostname;
      if (BLOCKED_HOSTS.test(host)) continue;
      if (/\.(png|jpg|jpeg|gif|svg|pdf)$/i.test(href)) continue;
      return href;
    } catch {
      continue;
    }
  }
  return null;
}

function pickPhoneFromHtml(html: string): string | null {
  const tel = html.match(/href=["']tel:([^"']+)["']/i)?.[1];
  if (tel) return tel.replace(/\s+/g, " ").trim();
  const uk = html.match(/\b(?:\+44|0)\d{2,4}[\s-]?\d{3,4}[\s-]?\d{3,4}\b/);
  return uk?.[0]?.replace(/\s+/g, " ").trim() ?? null;
}

const MAILTO_RE = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function pickWebsiteFromHtml(html: string): string | null {
  const direct = pickExternalWebsite(html);
  if (direct) return direct;

  for (const match of html.matchAll(/"(https?:\/\/[^"]+)"/g)) {
    const href = match[1];
    if (!href) continue;
    try {
      const host = new URL(href).hostname;
      if (BLOCKED_HOSTS.test(host)) continue;
      if (/\.(png|jpg|jpeg|gif|svg|pdf|woff|css|js)$/i.test(href)) continue;
      return href;
    } catch {
      continue;
    }
  }

  const nextData = extractNextDataJson(html);
  if (nextData) {
    const blob = JSON.stringify(nextData);
    return pickWebsiteFromHtml(blob);
  }
  return null;
}

async function fetchPlatformHtml(url: string, cookie?: string): Promise<string | null> {
  return fetchHtml(url, 15_000, {
    Cookie: cookie ?? "",
    "User-Agent": BROWSER_UA,
    Accept: "text/html",
  });
}

function pickEmailFromHtml(html: string, websiteUrl: string | null): string | null {
  const candidates = new Set<string>();
  let m: RegExpExecArray | null;
  MAILTO_RE.lastIndex = 0;
  while ((m = MAILTO_RE.exec(html)) !== null) candidates.add(m[1]!.trim().toLowerCase());
  for (const raw of html.match(EMAIL_RE) ?? []) candidates.add(raw.trim().toLowerCase());

  for (const email of candidates) {
    if (isValidProspectEmail(email, websiteUrl).ok) return email;
  }
  return null;
}

function pageContactFromHtml(html: string): PlatformPageContact {
  const websiteUrl = pickWebsiteFromHtml(html);
  return {
    websiteUrl,
    phoneNumber: pickPhoneFromHtml(html),
    contactEmail: pickEmailFromHtml(html, websiteUrl),
  };
}

function mergePlatformContacts(...parts: PlatformPageContact[]): PlatformPageContact {
  let websiteUrl: string | null = null;
  let phoneNumber: string | null = null;
  let contactEmail: string | null = null;
  for (const p of parts) {
    websiteUrl = websiteUrl || p.websiteUrl;
    phoneNumber = phoneNumber || p.phoneNumber;
    contactEmail = contactEmail || p.contactEmail;
  }
  return { websiteUrl, phoneNumber, contactEmail };
}

export async function scrapeWebsitePhone(websiteUrl: string): Promise<string | null> {
  const normalized = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`;
  const homepage = await fetchSiteHtml(normalized);
  if (!homepage) return null;

  const pages = [normalized, ...discoverContactUrls(homepage, normalized)];
  for (const pageUrl of pages) {
    const html = pageUrl === normalized ? homepage : await fetchSiteHtml(pageUrl);
    if (!html) continue;
    const phone = pickPhoneFromHtml(html);
    if (phone) return phone;
  }
  return null;
}

async function fetchSiteHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url.startsWith("http") ? url : `https://${url}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KOB-LeadEngine/1.0)",
        Accept: "text/html",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function discoverContactUrls(html: string, baseUrl: string): string[] {
  const paths = ["/contact", "/contact-us", "/about", "/about-us", "/get-in-touch"];
  const found = new Set<string>();
  const base = new URL(baseUrl);
  for (const path of paths) {
    try {
      found.add(new URL(path, base).toString());
    } catch {
      /* ignore */
    }
  }
  for (const match of html.matchAll(/href=["']([^"']+)["']/gi)) {
    const href = match[1]?.trim();
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) continue;
    const lower = href.toLowerCase();
    if (!/(contact|about|reach|enquir|reserv|book)/.test(lower)) continue;
    try {
      const url = new URL(href, base);
      if (url.hostname !== base.hostname) continue;
      found.add(url.toString());
    } catch {
      /* ignore */
    }
  }
  return [...found].slice(0, 6);
}

async function fetchJustEatHtml(lead: MergedPlatformLead): Promise<string | null> {
  const menuPath = lead.deliveryPlatforms.includes("justeat")
    ? resolveJustEatMenuPath(lead.name, lead.city, lead.justEatMenuUrl ?? lead.platformUrl)
    : null;
  if (!menuPath) return null;

  const path = menuPath.startsWith("/") ? menuPath : `/${menuPath}`;
  const host = lead.country === "IE" ? "https://www.just-eat.ie" : "https://www.just-eat.co.uk";
  const url = `${host}${path}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KOB-LeadEngine/1.0)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Pull owner website / phone from Just Eat menu page. */
export async function discoverFromJustEatPage(lead: MergedPlatformLead): Promise<PlatformPageContact> {
  const html = await fetchJustEatHtml(lead);
  if (!html) return { websiteUrl: null, phoneNumber: null, contactEmail: null };
  return pageContactFromHtml(html);
}

/** Pull owner website / phone from Deliveroo menu page. */
export async function discoverFromDeliverooPage(lead: MergedPlatformLead): Promise<PlatformPageContact> {
  const menuUrl = lead.deliverooMenuUrl ?? (lead.platformUrl?.includes("deliveroo") ? lead.platformUrl : null);
  if (!menuUrl) return { websiteUrl: null, phoneNumber: null, contactEmail: null };

  const html = await fetchPlatformHtml(menuUrl, `roo_guid=${randomUUID()}`);
  if (!html) return { websiteUrl: null, phoneNumber: null, contactEmail: null };
  return pageContactFromHtml(html);
}

/** Pull owner website / phone from Uber Eats store page. */
export async function discoverFromUberEatsPage(lead: MergedPlatformLead): Promise<PlatformPageContact> {
  const menuUrl =
    lead.uberEatsMenuUrl ??
    (lead.platformUrl?.includes("ubereats.com") ? lead.platformUrl : null);
  if (!menuUrl) return { websiteUrl: null, phoneNumber: null, contactEmail: null };

  const html = await fetchPlatformHtml(
    menuUrl.startsWith("http") ? menuUrl : `https://www.ubereats.com${menuUrl}`,
  );
  if (!html) return { websiteUrl: null, phoneNumber: null, contactEmail: null };
  return pageContactFromHtml(html);
}

/** Try Just Eat, Deliveroo, and Uber Eats pages for owner contact details. */
export async function discoverFromAllPlatformPages(lead: MergedPlatformLead): Promise<PlatformPageContact> {
  const parts: PlatformPageContact[] = [];
  parts.push(await discoverFromJustEatPage(lead));
  if (lead.deliverooMenuUrl || lead.deliveryPlatforms.includes("deliveroo")) {
    parts.push(await discoverFromDeliverooPage(lead));
  }
  if (lead.uberEatsMenuUrl || lead.deliveryPlatforms.includes("ubereats")) {
    parts.push(await discoverFromUberEatsPage(lead));
  }
  return mergePlatformContacts(...parts);
}

/** @deprecated */
export async function discoverWebsiteFromJustEat(lead: MergedPlatformLead): Promise<string | null> {
  return (await discoverFromJustEatPage(lead)).websiteUrl;
}

export async function resolveRestaurantWebsite(
  lead: MergedPlatformLead,
  google: GoogleEnrichedLead,
): Promise<GoogleEnrichedLead> {
  const fromPlatforms = await discoverFromAllPlatformPages(lead);

  return {
    ...google,
    websiteUrl: google.websiteUrl?.trim() || fromPlatforms.websiteUrl,
    phoneNumber: google.phoneNumber?.trim() || fromPlatforms.phoneNumber,
  };
}
