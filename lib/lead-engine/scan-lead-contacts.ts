import { discoverWebsiteViaGoogleSearch } from "@/lib/lead-engine/discover-website-google-search";
import { discoverWebsiteViaWebSearch } from "@/lib/lead-engine/discover-website-web-search";
import { alternateWebsiteTld, discoverWebsiteByDomainGuess } from "@/lib/lead-engine/guess-website-url";
import { enrichLeadFromGoogle } from "@/lib/lead-engine/google-enrich";
import {
  discoverFromAllPlatformPages,
  scrapeWebsitePhone,
} from "@/lib/lead-engine/find-restaurant-website";
import { resolveJustEatMenuPath } from "@/lib/lead-engine/justeat-menu-url";
import type { MergedPlatformLead } from "@/lib/lead-engine/merge-platform-listings";
import { fetchRenderedHtml } from "@/lib/lead-engine/scrapers/playwright-fetch";
import { isValidProspectEmail } from "@/lib/outbound/validate-prospect-email";
import { scrapeWebsiteEmail } from "@/lib/outbound/scrape-website-email";

const MAILTO_RE = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

let placesKeyWarned = false;

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

async function scrapeEmailFromSite(websiteUrl: string): Promise<string | null> {
  const fromStatic = await scrapeWebsiteEmail(websiteUrl);
  if (fromStatic) return fromStatic;

  if (process.env.LEAD_ENGINE_USE_BROWSER?.trim() !== "1") return null;

  const rendered = await fetchRenderedHtml(websiteUrl, 2000);
  if (rendered) {
    const email = pickEmailFromHtml(rendered, websiteUrl);
    if (email) return email;
  }

  for (const path of ["/contact-us", "/contact", "/about"]) {
    try {
      const pageUrl = new URL(path, websiteUrl).toString();
      const renderedPage = await fetchRenderedHtml(pageUrl, 1500);
      if (!renderedPage) continue;
      const email = pickEmailFromHtml(renderedPage, websiteUrl);
      if (email) return email;
    } catch {
      continue;
    }
  }
  return null;
}

export type ContactScanResult = {
  websiteUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  enrichmentSource: string;
  placeId: string | null;
  formattedAddress: string | null;
  platformMenuUrl: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
};

export function withPlatformMenuUrls(lead: MergedPlatformLead): MergedPlatformLead {
  const menu = lead.platformUrl ?? lead.justEatMenuUrl;
  let justEatMenuUrl = lead.justEatMenuUrl;
  let deliverooMenuUrl = lead.deliverooMenuUrl;
  let uberEatsMenuUrl = lead.uberEatsMenuUrl;

  if (menu?.includes("just-eat") && !justEatMenuUrl) justEatMenuUrl = menu;
  if (menu?.includes("deliveroo") && !deliverooMenuUrl) deliverooMenuUrl = menu;
  if (menu?.includes("ubereats") && !uberEatsMenuUrl) uberEatsMenuUrl = menu;

  if (lead.deliveryPlatforms.includes("justeat")) {
    justEatMenuUrl = resolveJustEatMenuPath(lead.name, lead.city, justEatMenuUrl ?? menu);
  }

  return {
    ...lead,
    justEatMenuUrl: justEatMenuUrl ?? null,
    deliverooMenuUrl: deliverooMenuUrl ?? null,
    uberEatsMenuUrl: uberEatsMenuUrl ?? null,
    platformUrl: menu ?? justEatMenuUrl ?? deliverooMenuUrl ?? uberEatsMenuUrl,
  };
}

/** Find website + scrape homepage/contact pages for email and phone. */
export async function scanLeadContacts(lead: MergedPlatformLead): Promise<ContactScanResult> {
  const prepared = withPlatformMenuUrls(lead);
  const menuUrl =
    prepared.justEatMenuUrl ?? prepared.deliverooMenuUrl ?? prepared.uberEatsMenuUrl ?? prepared.platformUrl;

  let websiteUrl: string | null = null;
  let contactPhone: string | null = null;
  let contactEmail: string | null = null;
  let enrichmentSource = "scanned_no_site";
  let placeId: string | null = null;
  let formattedAddress: string | null = prepared.address;
  let googleRating: number | null = null;
  let googleReviewCount: number | null = null;

  const skipPlatformHtml = process.env.LEAD_ENGINE_SKIP_PLATFORM_HTML?.trim() === "1";
  let fromPlatforms: { websiteUrl: string | null; phoneNumber: string | null; contactEmail: string | null } = {
    websiteUrl: null,
    phoneNumber: null,
    contactEmail: null,
  };
  if (!skipPlatformHtml) {
    fromPlatforms = await discoverFromAllPlatformPages(prepared);
    contactPhone = fromPlatforms.phoneNumber;
    contactEmail = fromPlatforms.contactEmail;
  }

  const placesKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (placesKey) {
    const google = await enrichLeadFromGoogle(prepared.name, prepared.city, prepared.country);
    if (google) {
      websiteUrl = google.websiteUrl ?? fromPlatforms.websiteUrl;
      contactPhone = contactPhone || google.phoneNumber;
      placeId = google.placeId;
      formattedAddress = google.formattedAddress || formattedAddress;
      googleRating = google.rating;
      googleReviewCount = google.reviewCount;
    }
  } else if (!placesKeyWarned) {
    placesKeyWarned = true;
    console.warn("[lead-engine] GOOGLE_PLACES_API_KEY missing — website lookup degraded");
  }

  if (!websiteUrl) {
    websiteUrl = fromPlatforms.websiteUrl;
  }

  if (!websiteUrl) {
    websiteUrl = await discoverWebsiteViaWebSearch(prepared.name, prepared.city);
  }

  if (!websiteUrl) {
    websiteUrl = await discoverWebsiteViaGoogleSearch(prepared.name, prepared.city);
  }

  if (!websiteUrl) {
    websiteUrl = await discoverWebsiteByDomainGuess(prepared.name, prepared.city);
  }

  if (websiteUrl?.trim()) {
    if (!contactEmail) {
      contactEmail = await scrapeEmailFromSite(websiteUrl);
    }
    if (!contactEmail) {
      const alt = alternateWebsiteTld(websiteUrl);
      if (alt) {
        const altEmail = await scrapeEmailFromSite(alt);
        if (altEmail) {
          contactEmail = altEmail;
          websiteUrl = alt;
        }
      }
    }
    if (!contactPhone) {
      contactPhone = await scrapeWebsitePhone(websiteUrl);
    }
    enrichmentSource = contactEmail ? "scrape" : contactPhone ? "platform_phone" : "scanned_no_email";
  } else if (contactEmail) {
    enrichmentSource = "platform";
  } else if (contactPhone) {
    enrichmentSource = "platform_phone";
  }

  return {
    websiteUrl,
    contactEmail,
    contactPhone,
    enrichmentSource,
    placeId,
    formattedAddress,
    platformMenuUrl: menuUrl,
    googleRating,
    googleReviewCount,
  };
}
