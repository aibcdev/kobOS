import type { UrlSignals } from "@/lib/audit/analyze-url";
import { analyzeWebsiteFull } from "@/lib/audit/analyze-url";
import { computeEngagementSignals } from "@/lib/audit/engagement-signals";
import { detectLocationCount } from "@/lib/lead-engine/detect-location-count";
import { passesLeadIcpFilters } from "@/lib/lead-engine/icp-filters";
import { getLeadEngineConfig, isLeadEngineFastAnalyze } from "@/lib/lead-engine/config";
import {
  isWeakOwnerWebsite,
  scoreWebsiteSignals,
} from "@/lib/lead-engine/quick-website-scan";
import { fetchInstagramPublicStats } from "@/lib/lead-engine/instagram-public";
import type { LeadProspect } from "@prisma/client";

export type ProspectAnalysis = {
  instagramUrl: string | null;
  instagramFollowers: number | null;
  instagramPostGapDays: number | null;
  hasTikTok: boolean;
  facebookUrl: string | null;
  hasContactForm: boolean;
  weakWebsite: boolean;
  weakPhotography: boolean;
  hasEmailCapture: boolean;
  pdfMenu: boolean;
  hasGoogleBusinessPosts: boolean;
  hasTripadvisor: boolean;
  hasOnlineOrdering: boolean;
  qualifyScore: number;
  ratingBand: "ideal" | "low";
  websiteStale: boolean;
  websiteCopyrightYear: number | null;
  locationCount: number;
};

function baseSignals(partial: Partial<UrlSignals> & Pick<UrlSignals, "fetched">): UrlSignals {
  return {
    status: undefined,
    titleLen: 0,
    hasMetaDescription: false,
    metaDescriptionLen: 0,
    h1Count: 0,
    h2Count: 0,
    hasOgTitle: false,
    hasCanonical: false,
    hasJsonLd: false,
    hasRestaurantSchema: false,
    hasViewport: false,
    isHttps: true,
    hasTelLink: false,
    hasMailto: false,
    hasBookOrReserveKeyword: false,
    hasOpenTableOrResy: false,
    imgCount: 0,
    imgWithAltCount: 0,
    htmlSizeKb: 0,
    hasOgImage: false,
    hasTwitterCard: false,
    hasLangAttr: false,
    hasNoindex: false,
    robotsTxtFound: false,
    sitemapFound: false,
    mentionsRobotsOrSitemap: false,
    ...partial,
  };
}

function signalsFromHtml(url: string, html: string, status: number): UrlSignals {
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "";
  const metaDesc = html.match(/name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] ?? "";
  return baseSignals({
    fetched: true,
    status,
    isHttps: url.startsWith("https"),
    hasMetaDescription: Boolean(metaDesc),
    metaDescriptionLen: metaDesc.length,
    hasJsonLd: /application\/ld\+json/i.test(html),
    hasRestaurantSchema: /Restaurant|FoodEstablishment/i.test(html),
    hasViewport: /name=["']viewport["']/i.test(html),
    hasCanonical: /rel=["']canonical["']/i.test(html),
    hasOgTitle: /property=["']og:title["']/i.test(html),
    hasOgImage: /property=["']og:image["']/i.test(html),
    h1Count: (html.match(/<h1[\s>]/gi) ?? []).length,
    h2Count: (html.match(/<h2[\s>]/gi) ?? []).length,
    titleLen: title.length,
    hasTelLink: /href=["']tel:/i.test(html),
    hasMailto: /href=["']mailto:/i.test(html),
    hasBookOrReserveKeyword: /\b(book|reserv|table)\b/i.test(html),
    imgCount: (html.match(/<img[\s>]/gi) ?? []).length,
    htmlSizeKb: Math.round(html.length / 1024),
  });
}

function stalenessFromHtml(html: string): { websiteStale: boolean; websiteCopyrightYear: number | null } {
  const { staleWebsiteYears } = getLeadEngineConfig();
  const yearNow = new Date().getFullYear();
  const cutoffYear = yearNow - staleWebsiteYears;
  const copyrightMatch = html.match(/©\s*(\d{4})|copyright\s*(\d{4})/i);
  const websiteCopyrightYear = copyrightMatch
    ? Number(copyrightMatch[1] ?? copyrightMatch[2])
    : null;
  const websiteStale =
    websiteCopyrightYear != null &&
    Number.isFinite(websiteCopyrightYear) &&
    websiteCopyrightYear <= cutoffYear;
  return { websiteStale, websiteCopyrightYear };
}

async function fetchHtml(url: string, timeoutMs: number): Promise<{ html: string; status: number | null }> {
  try {
    const res = await fetch(url.startsWith("http") ? url : `https://${url}`, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "KOB-LeadEngine/1.0 (+https://trykob.com)" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return { html: "", status: res.status };
    return { html: await res.text(), status: res.status };
  } catch {
    return { html: "", status: null };
  }
}

export async function analyzeProspectWebsite(
  prospect: Pick<
    LeadProspect,
    | "websiteUrl"
    | "name"
    | "city"
    | "country"
    | "rating"
    | "reviewCount"
    | "contactPhone"
    | "contactEmail"
    | "platformRankPercentile"
    | "lastReviewAt"
    | "businessType"
    | "deliveryPlatforms"
  >,
): Promise<ProspectAnalysis | null> {
  const url = prospect.websiteUrl?.trim();
  if (!url) return null;

  const fast = isLeadEngineFastAnalyze();
  const locationMax = getLeadEngineConfig().locationMax;

  let signals: UrlSignals;
  let htmlStr = "";
  let instagramUrl: string | null = null;
  let facebookUrl: string | null = null;
  let hasTikTok = false;
  let instagramPostGapDays: number | null = null;
  let instagramFollowers: number | null = null;

  if (fast) {
    const page = await fetchHtml(url, 6_000);
    htmlStr = page.html;
    if (!htmlStr) return null;
    signals = signalsFromHtml(url, htmlStr, page.status ?? 200);
    instagramUrl = htmlStr.match(/https?:\/\/(?:www\.)?instagram\.com\/[^\s"'<>]+/i)?.[0] ?? null;
    facebookUrl = htmlStr.match(/https?:\/\/(?:www\.)?facebook\.com\/[^\s"'<>]+/i)?.[0] ?? null;
    hasTikTok = /tiktok\.com/i.test(htmlStr);
  } else {
    const full = await analyzeWebsiteFull(url);
    signals = full.signals;
    const page = await fetchHtml(url, 8_000);
    htmlStr = page.html;
    const ig = full.pageEvidence.socialLinksFound.find((s) => s.platform === "instagram");
    const fb = full.pageEvidence.socialLinksFound.find((s) => s.platform === "facebook");
    instagramUrl = ig?.url ?? null;
    facebookUrl = fb?.url ?? null;
    hasTikTok = full.pageEvidence.socialLinksFound.some((s) => s.platform === "tiktok");
    if (instagramUrl) {
      const stats = await fetchInstagramPublicStats(instagramUrl);
      instagramPostGapDays = stats.postGapDays;
      instagramFollowers = stats.followers;
    }
  }

  // Location after HTML is available so we reuse the same page body.
  const locationCount = await detectLocationCount(
    prospect.name,
    prospect.city,
    url,
    (prospect.country as "GB" | "IE") ?? "GB",
    htmlStr,
  );
  if (locationCount > locationMax) return null;

  const qualifyScore = scoreWebsiteSignals(signals);
  const weakWebsite = isWeakOwnerWebsite(signals, qualifyScore, htmlStr);
  const weakPhotography = signals.imgCount < 3 || !signals.hasOgImage;
  const engagement = htmlStr ? computeEngagementSignals(htmlStr, signals) : null;
  const { websiteStale, websiteCopyrightYear } = stalenessFromHtml(htmlStr);

  const icp = passesLeadIcpFilters({
    name: prospect.name,
    websiteUrl: url,
    contactPhone: prospect.contactPhone,
    contactEmail: prospect.contactEmail,
    rating: prospect.rating,
    reviewCount: prospect.reviewCount,
    locationCount,
    platformRankPercentile: prospect.platformRankPercentile,
    lastReviewAt: prospect.lastReviewAt,
    instagramUrl,
    instagramPostGapDays,
    businessType: prospect.businessType,
    deliveryPlatforms: prospect.deliveryPlatforms,
    hasOnlineOrdering:
      engagement?.ctaAudit.orderOnline ?? /\b(order\s*online|deliveroo|uber\s*eats|just\s*eat)\b/i.test(htmlStr),
  });
  if (!icp.ok) return null;

  return {
    instagramUrl,
    instagramFollowers,
    instagramPostGapDays,
    hasTikTok,
    facebookUrl,
    hasContactForm: /\b(contact\s*us|get\s*in\s*touch|enquir)/i.test(htmlStr) && /<form[\s>]/i.test(htmlStr),
    weakWebsite,
    weakPhotography,
    hasEmailCapture: engagement?.ctaAudit.emailCapture ?? /type=["']email["']/i.test(htmlStr),
    pdfMenu: /\.pdf[\s"']/i.test(htmlStr) && /\bmenu\b/i.test(htmlStr),
    hasGoogleBusinessPosts: false,
    hasTripadvisor: /tripadvisor\.(com|co\.uk)/i.test(htmlStr),
    hasOnlineOrdering:
      engagement?.ctaAudit.orderOnline ?? /\b(order\s*online|deliveroo|uber\s*eats|just\s*eat)\b/i.test(htmlStr),
    qualifyScore,
    ratingBand: icp.ratingBand,
    websiteStale,
    websiteCopyrightYear,
    locationCount,
  };
}
