import { analyzeWebsiteFull } from "@/lib/audit/analyze-url";
import { computeEngagementSignals } from "@/lib/audit/engagement-signals";
import { detectLocationCount } from "@/lib/lead-engine/detect-location-count";
import { passesLeadIcpFilters } from "@/lib/lead-engine/icp-filters";
import {
  isWeakOwnerWebsite,
  quickWebsiteScan,
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
    | "reviewCount"
    | "contactPhone"
    | "contactEmail"
    | "platformRankPercentile"
  >,
): Promise<ProspectAnalysis | null> {
  const url = prospect.websiteUrl?.trim();
  if (!url) return null;

  const scan = await quickWebsiteScan(url);
  if (!scan) return null;

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
  const qualifyScore = scoreWebsiteSignals(signals);
  const engagement = computeEngagementSignals(htmlStr, signals);

  const instagram = pageEvidence.socialLinksFound.find((s) => s.platform === "instagram");
  const facebook = pageEvidence.socialLinksFound.find((s) => s.platform === "facebook");
  const tiktok = pageEvidence.socialLinksFound.some((s) => s.platform === "tiktok");

  let instagramPostGapDays: number | null = null;
  if (instagram?.url) {
    const stats = await fetchInstagramPublicStats(instagram.url);
    instagramPostGapDays = stats.postGapDays;
  }

  const hasContactForm = /\b(contact\s*us|get\s*in\s*touch|enquir)/i.test(htmlStr) && /<form[\s>]/i.test(htmlStr);
  const pdfMenu = /\.pdf[\s"']/i.test(htmlStr) && /\bmenu\b/i.test(htmlStr);
  const hasTripadvisor = /tripadvisor\.(com|co\.uk)/i.test(htmlStr);
  const weakWebsite = isWeakOwnerWebsite(signals, qualifyScore, htmlStr);
  const weakPhotography = scan.weakPhotography;
  const hasGoogleBusinessPosts = false;

  const locationCount = await detectLocationCount(
    prospect.name,
    prospect.city,
    url,
    (prospect.country as "GB" | "IE") ?? "GB",
  );

  const icp = passesLeadIcpFilters({
    name: prospect.name,
    websiteUrl: url,
    contactPhone: prospect.contactPhone,
    contactEmail: prospect.contactEmail,
    rating: prospect.rating,
    reviewCount: prospect.reviewCount,
    locationCount,
    platformRankPercentile: prospect.platformRankPercentile,
  });
  if (!icp.ok) return null;

  return {
    instagramUrl: scan.instagramUrl,
    instagramFollowers: scan.instagramFollowers,
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
    websiteStale: scan.websiteStale,
    websiteCopyrightYear: scan.websiteCopyrightYear,
    locationCount,
  };
}
