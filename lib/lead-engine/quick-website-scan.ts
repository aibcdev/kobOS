import { analyzeWebsiteFull } from "@/lib/audit/analyze-url";
import type { UrlSignals } from "@/lib/audit/analyze-url";
import { detectWebsiteStaleness } from "@/lib/lead-engine/detect-website-staleness";
import { fetchInstagramPublicStats } from "@/lib/lead-engine/instagram-public";

export type QuickWebsiteScan = {
  qualifyScore: number;
  weakWebsite: boolean;
  weakPhotography: boolean;
  hasContactForm: boolean;
  instagramUrl: string | null;
  instagramFollowers: number | null;
  websiteStale: boolean;
  websiteCopyrightYear: number | null;
};

export function scoreWebsiteSignals(s: UrlSignals): number {
  let score = 28;
  if (s.fetched) score += 8;
  if (s.status && s.status >= 200 && s.status < 400) score += 6;
  if (s.isHttps) score += 6;
  if (s.hasMetaDescription) score += 10;
  if (s.hasJsonLd) score += 12;
  if (s.hasRestaurantSchema) score += 4;
  if (s.hasViewport) score += 10;
  if (s.hasCanonical) score += 5;
  if (s.hasOgTitle) score += 5;
  if (s.robotsTxtFound) score += 3;
  if (s.sitemapFound) score += 3;
  if (s.h1Count === 1) score += 6;
  if (s.titleLen >= 12 && s.titleLen <= 70) score += 6;
  if (s.hasTelLink) score += 4;
  if (s.hasBookOrReserveKeyword) score += 4;
  if (s.imgCount >= 3) score += 5;
  return Math.min(100, score);
}

/** Primary ICP signal: dated, thin, or broken owner sites (e.g. cowpigchicken.co.uk). */
export function isWeakOwnerWebsite(
  signals: UrlSignals,
  qualifyScore: number,
  htmlStr: string,
): boolean {
  if (!signals.fetched || (signals.status != null && signals.status >= 400)) return true;
  if (qualifyScore < 55) return true;
  if (!signals.hasMetaDescription || !signals.hasViewport) return true;
  if (signals.imgCount < 2) return true;
  if (signals.h1Count === 0 && signals.titleLen < 8) return true;
  if (/wix\.com|squarespace|weebly|godaddy website builder/i.test(htmlStr) && qualifyScore < 62) {
    return true;
  }
  return false;
}

export async function quickWebsiteScan(websiteUrl: string): Promise<QuickWebsiteScan | null> {
  const url = websiteUrl.trim();
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

  const qualifyScore = scoreWebsiteSignals(signals);
  const weakWebsite = isWeakOwnerWebsite(signals, qualifyScore, htmlStr);
  const weakPhotography =
    signals.imgCount < 3 || !signals.hasOgImage || pageEvidence.imageCandidates.length < 2;

  const instagram = pageEvidence.socialLinksFound.find((s) => s.platform === "instagram");
  let instagramFollowers: number | null = null;
  if (instagram?.url) {
    const stats = await fetchInstagramPublicStats(instagram.url);
    instagramFollowers = stats.followers;
  }

  const staleness = await detectWebsiteStaleness(url);
  const hasContactForm =
    /\b(contact\s*us|get\s*in\s*touch|enquir)/i.test(htmlStr) && /<form[\s>]/i.test(htmlStr);

  return {
    qualifyScore,
    weakWebsite,
    weakPhotography,
    hasContactForm,
    instagramUrl: instagram?.url ?? null,
    instagramFollowers,
    websiteStale: staleness.stale,
    websiteCopyrightYear: staleness.copyrightYear,
  };
}
