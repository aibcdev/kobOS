import { detectLocationCount } from "@/lib/lead-engine/detect-location-count";
import { enrichLeadFromGoogle, type GoogleEnrichedLead } from "@/lib/lead-engine/google-enrich";
import { resolveRestaurantWebsite, scrapeWebsitePhone } from "@/lib/lead-engine/find-restaurant-website";
import { effectiveReviewCount, passesLeadIcpFilters } from "@/lib/lead-engine/icp-filters";
import type { MergedPlatformLead } from "@/lib/lead-engine/merge-platform-listings";
import { quickWebsiteScan } from "@/lib/lead-engine/quick-website-scan";
import { scrapeWebsiteEmail } from "@/lib/outbound/scrape-website-email";

export type PlatformLeadEnrichment = {
  google: GoogleEnrichedLead;
  contactEmail: string | null;
  emailSource: string | null;
  locationCount: number | null;
  weakWebsite: boolean;
  websiteStale: boolean;
  websiteCopyrightYear: number | null;
  hasContactForm: boolean;
  instagramUrl: string | null;
  instagramFollowers: number | null;
  icpReason?: string;
};

function baseFromPlatform(lead: MergedPlatformLead): GoogleEnrichedLead {
  return {
    placeId: null,
    name: lead.name,
    city: lead.city,
    formattedAddress: lead.address ?? "",
    websiteUrl: null,
    phoneNumber: null,
    rating: lead.platformRating,
    reviewCount: lead.platformReviewCount,
    lastReviewAt: null,
  };
}

function isFullScan(): boolean {
  return process.env.LEAD_ENGINE_FULL_SCAN?.trim() === "1";
}

export async function enrichPlatformLead(
  lead: MergedPlatformLead,
  options?: { fast?: boolean },
): Promise<PlatformLeadEnrichment> {
  const fast = options?.fast ?? process.env.LEAD_ENGINE_FAST_ENRICH?.trim() !== "0";

  const googleRaw = await enrichLeadFromGoogle(lead.name, lead.city, lead.country);
  const merged = googleRaw
    ? await resolveRestaurantWebsite(lead, googleRaw)
    : await resolveRestaurantWebsite(lead, baseFromPlatform(lead));

  const googleBase = merged ?? baseFromPlatform(lead);
  const bestReviews = Math.max(
    googleBase.reviewCount ?? 0,
    lead.platformReviewCount ?? 0,
  );
  const google: GoogleEnrichedLead = {
    ...googleBase,
    rating: googleBase.rating ?? lead.platformRating,
    reviewCount: bestReviews > 0 ? bestReviews : googleBase.reviewCount,
  };

  let contactEmail: string | null = null;
  let emailSource: string | null = null;
  let contactPhone = google.phoneNumber?.trim() || null;

  if (google.websiteUrl?.trim()) {
    const scraped = await scrapeWebsiteEmail(google.websiteUrl);
    if (scraped) {
      contactEmail = scraped;
      emailSource = "scrape";
    }
    if (!contactPhone) {
      contactPhone = await scrapeWebsitePhone(google.websiteUrl);
    }
  }

  let locationCount: number | null = null;
  let weakWebsite = false;
  let websiteStale = false;
  let websiteCopyrightYear: number | null = null;
  let hasContactForm = false;
  let instagramUrl: string | null = null;
  let instagramFollowers: number | null = null;

  if (google.websiteUrl?.trim() && (!fast || isFullScan())) {
    const scan = await quickWebsiteScan(google.websiteUrl);
    if (scan) {
      weakWebsite = scan.weakWebsite;
      websiteStale = scan.websiteStale;
      websiteCopyrightYear = scan.websiteCopyrightYear;
      hasContactForm = scan.hasContactForm;
      instagramUrl = scan.instagramUrl;
      instagramFollowers = scan.instagramFollowers;
    }
    locationCount = await detectLocationCount(
      google.name,
      lead.city,
      google.websiteUrl,
      lead.country,
    );
  }

  const icp = passesLeadIcpFilters({
    name: google.name,
    websiteUrl: google.websiteUrl,
    contactPhone,
    contactEmail,
    rating: google.rating,
    reviewCount: google.reviewCount,
    platformReviewCount: lead.platformReviewCount,
    platformRankPercentile: lead.platformRankPercentile,
    locationCount,
  });

  const base = {
    google: { ...google, phoneNumber: contactPhone },
    contactEmail,
    emailSource,
    locationCount,
    weakWebsite,
    websiteStale,
    websiteCopyrightYear,
    hasContactForm,
    instagramUrl,
    instagramFollowers,
  };

  if (!icp.ok) {
    return { ...base, icpReason: icp.reason };
  }

  return base;
}

export function enrichmentQualifies(enrichment: PlatformLeadEnrichment): boolean {
  return !enrichment.icpReason;
}

export { effectiveReviewCount };
