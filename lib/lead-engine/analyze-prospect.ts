import { analyzeWebsiteFull } from "@/lib/audit/analyze-url";
import { computeEngagementSignals } from "@/lib/audit/engagement-signals";
import { fetchInstagramPublicStats } from "@/lib/lead-engine/instagram-public";
import { detectLocationCount } from "@/lib/lead-engine/detect-location-count";
import { detectWebsiteStaleness } from "@/lib/lead-engine/detect-website-staleness";
import { passesLeadIcpFilters } from "@/lib/lead-engine/icp-filters";
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

function scoreFromSignals(s: import("@/lib/audit/analyze-url").UrlSignals): number {
  let score = 28;
  if (s.fetched) score += 8;
  if (s.status && s.status >= 200 && s.status < 400) score += 6;
  if (s.isHttps) score += 6;
  if (s.hasMetaDescription) score += 10;
  if (s.hasJsonLd) score += 12;
  if (s.hasViewport) score += 10;
  if (s.hasCanonical) score += 5;
  if (s.hasOgTitle) score += 5;
  if (s.h1Count === 1) score += 6;
  if (s.titleLen >= 12 && s.titleLen <= 70) score += 6;
  if (s.hasTelLink) score += 4;
  if (s.hasBookOrReserveKeyword) score += 4;
  if (s.imgCount >= 3) score += 5;
  return Math.min(100, score);
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
    | "lastReviewAt"
    | "platformRankPercentile"
  >,
): Promise<ProspectAnalysis | null> {
  const url = prospect.websiteUrl?.trim();
  if (!url) return null;

  const { signals, pageEvidence } = await analyzeWebsiteFull(url);
  let htmlStr = "";
  try {
    const res = await fetch(url.startsWith("http") ? url : `https://${url}`, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "KOB-LeadEngine/1.0 (+https://trykob.com)" },
      signal: AbortSignal.timeout(12_000),
    });
    if (res.ok) htmlStr = await res.text();
  } catch {
    htmlStr = "";
  }
  const qualifyScore = scoreFromSignals(signals);
  const engagement = computeEngagementSignals(htmlStr, signals);

  const instagram = pageEvidence.socialLinksFound.find((s) => s.platform === "instagram");
  const facebook = pageEvidence.socialLinksFound.find((s) => s.platform === "facebook");
  const tiktok = pageEvidence.socialLinksFound.some((s) => s.platform === "tiktok");

  let instagramFollowers: number | null = null;
  let instagramPostGapDays: number | null = null;
  if (instagram?.url) {
    const stats = await fetchInstagramPublicStats(instagram.url);
    instagramFollowers = stats.followers;
    instagramPostGapDays = stats.postGapDays;
  }

  const hasContactForm = /\b(contact\s*us|get\s*in\s*touch|enquir)/i.test(htmlStr) && /<form[\s>]/i.test(htmlStr);
  const pdfMenu = /\.pdf[\s"']/i.test(htmlStr) && /\bmenu\b/i.test(htmlStr);
  const hasTripadvisor = /tripadvisor\.(com|co\.uk)/i.test(htmlStr);
  const weakWebsite = qualifyScore < 55 || !signals.hasMetaDescription || !signals.hasViewport;
  const weakPhotography =
    signals.imgCount < 3 ||
    !signals.hasOgImage ||
    pageEvidence.imageCandidates.length < 2;
  const hasGoogleBusinessPosts = false;

  const staleness = await detectWebsiteStaleness(url, weakWebsite);
  const locationCount = await detectLocationCount(
    prospect.name,
    prospect.city,
    url,
    (prospect.country as "GB" | "IE") ?? "GB",
  );

  const icp = passesLeadIcpFilters({
    name: prospect.name,
    websiteUrl: url,
    userRatingCount: prospect.reviewCount,
    rating: prospect.rating,
    lastReviewAt: prospect.lastReviewAt,
    instagramFollowers,
    locationCount,
    platformRankPercentile: prospect.platformRankPercentile,
    websiteStale: staleness.stale,
  });
  if (!icp.ok) return null;

  return {
    instagramUrl: instagram?.url ?? null,
    instagramFollowers,
    instagramPostGapDays,
    hasTikTok: tiktok,
    facebookUrl: facebook?.url ?? null,
    hasContactForm,
    weakWebsite,
    weakPhotography,
    hasEmailCapture: engagement.ctaAudit.emailCapture,
    pdfMenu,
    hasGoogleBusinessPosts,
    hasTripadvisor,
    hasOnlineOrdering: engagement.ctaAudit.orderOnline,
    qualifyScore,
    ratingBand: icp.ratingBand,
    websiteStale: staleness.stale,
    websiteCopyrightYear: staleness.copyrightYear,
    locationCount,
  };
}
