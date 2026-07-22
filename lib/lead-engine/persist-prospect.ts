import { LeadBusinessType, LeadProspectStatus, type Prisma } from "@prisma/client";
import { platformFoundWhere, platformQualifiedWhere } from "@/lib/lead-engine/contactable-query";
import { hostFromWebsiteUrl } from "@/lib/outbound/chain-denylist";
import type { MergedPlatformLead } from "@/lib/lead-engine/merge-platform-listings";
import type { GoogleEnrichedLead } from "@/lib/lead-engine/google-enrich";
import type { KobScoreBreakdown } from "@/lib/lead-engine/kob-opportunity-score";
import { prisma } from "@/lib/db/prisma";

function normalizeWebsiteKey(url: string | null): string | null {
  const host = hostFromWebsiteUrl(url);
  return host || null;
}

export async function isLeadProspectDuplicateByKey(
  workspaceRestaurantId: string,
  canonicalKey: string,
  websiteUrl: string | null,
  placeId: string | null,
): Promise<boolean> {
  const existingByKey = await prisma.leadProspect.findFirst({
    where: { workspaceRestaurantId, canonicalKey, status: { not: LeadProspectStatus.ARCHIVED } },
    select: { id: true },
  });
  if (existingByKey) return true;

  const host = normalizeWebsiteKey(websiteUrl);
  const or: Array<
    | { placeId: string }
    | { websiteUrl: { contains: string; mode: "insensitive" } }
  > = [];
  if (placeId) or.push({ placeId });
  if (host) or.push({ websiteUrl: { contains: host, mode: "insensitive" } });
  if (!or.length) return false;

  const existing = await prisma.leadProspect.findFirst({
    where: { workspaceRestaurantId, status: { not: LeadProspectStatus.ARCHIVED }, OR: or },
    select: { id: true },
  });
  return Boolean(existing);
}

export async function persistPlatformLead(
  workspaceRestaurantId: string,
  platform: MergedPlatformLead,
  google: GoogleEnrichedLead,
  email: { email: string; source: string } | null,
  extras?: {
    contactPhone?: string | null;
    locationCount?: number | null;
    weakWebsite?: boolean;
    websiteStale?: boolean;
    websiteCopyrightYear?: number | null;
    hasContactForm?: boolean;
    instagramUrl?: string | null;
    instagramFollowers?: number | null;
    kobOpportunityScore?: number;
    scoreBreakdown?: KobScoreBreakdown;
    opportunities?: string[];
    disqualifiers?: string[];
  },
) {
  const data: Prisma.LeadProspectCreateInput = {
    workspaceRestaurant: { connect: { id: workspaceRestaurantId } },
    canonicalKey: platform.canonicalKey,
    placeId: google.placeId,
    name: google.name,
    city: platform.city,
    country: platform.country,
    formattedAddress: google.formattedAddress || platform.address,
    businessType: LeadBusinessType.RESTAURANT,
    websiteUrl: google.websiteUrl,
    contactPhone: extras?.contactPhone ?? google.phoneNumber ?? null,
    locationCount: extras?.locationCount ?? null,
    reviewCount: google.reviewCount,
    rating: google.rating,
    lastReviewAt: google.lastReviewAt,
    weakWebsite: extras?.weakWebsite ?? false,
    websiteStale: extras?.websiteStale ?? false,
    websiteCopyrightYear: extras?.websiteCopyrightYear ?? null,
    hasContactForm: extras?.hasContactForm ?? false,
    instagramUrl: extras?.instagramUrl ?? null,
    instagramFollowers: extras?.instagramFollowers ?? null,
    deliveryPlatforms: platform.deliveryPlatforms,
    platformRank: platform.platformRank,
    platformRankPercentile: platform.platformRankPercentile,
    platformRegion: platform.platformRegion,
    platformMenuUrl:
      platform.justEatMenuUrl ?? platform.deliverooMenuUrl ?? platform.uberEatsMenuUrl ?? platform.platformUrl,
    contactEmail: email?.email ?? null,
    enrichmentSource: email?.source ?? null,
    kobOpportunityScore: extras?.kobOpportunityScore ?? null,
    scoreBreakdown: extras?.scoreBreakdown ?? {},
    opportunities: extras?.opportunities ?? [],
    disqualifiers: extras?.disqualifiers ?? [],
    status: LeadProspectStatus.DISCOVERED,
  };

  return prisma.leadProspect.upsert({
    where: {
      workspaceRestaurantId_canonicalKey: {
        workspaceRestaurantId,
        canonicalKey: platform.canonicalKey,
      },
    },
    create: data,
    update: {
      placeId: google.placeId,
      name: google.name,
      websiteUrl: google.websiteUrl,
      contactPhone: extras?.contactPhone ?? google.phoneNumber ?? null,
      locationCount: extras?.locationCount ?? null,
      reviewCount: google.reviewCount,
      rating: google.rating,
      lastReviewAt: google.lastReviewAt,
      deliveryPlatforms: platform.deliveryPlatforms,
      platformRank: platform.platformRank,
      platformRankPercentile: platform.platformRankPercentile,
      platformRegion: platform.platformRegion,
      platformMenuUrl:
      platform.justEatMenuUrl ?? platform.deliverooMenuUrl ?? platform.uberEatsMenuUrl ?? platform.platformUrl,
      formattedAddress: google.formattedAddress || platform.address,
      weakWebsite: extras?.weakWebsite ?? false,
      websiteStale: extras?.websiteStale ?? false,
      websiteCopyrightYear: extras?.websiteCopyrightYear ?? null,
      hasContactForm: extras?.hasContactForm ?? false,
      instagramUrl: extras?.instagramUrl ?? null,
      instagramFollowers: extras?.instagramFollowers ?? null,
      kobOpportunityScore: extras?.kobOpportunityScore ?? null,
      scoreBreakdown: extras?.scoreBreakdown ?? {},
      opportunities: extras?.opportunities ?? [],
      disqualifiers: extras?.disqualifiers ?? [],
      ...(email ? { contactEmail: email.email, enrichmentSource: email.source } : {}),
    },
  });
}

export async function countFoundProspects(workspaceRestaurantId: string): Promise<number> {
  return prisma.leadProspect.count({
    where: platformFoundWhere(workspaceRestaurantId),
  });
}

export async function countQualifiedProspects(workspaceRestaurantId: string): Promise<number> {
  return prisma.leadProspect.count({
    where: platformQualifiedWhere(workspaceRestaurantId),
  });
}

/** @deprecated Use countQualifiedProspects — kept for callers expecting the old name */
export async function countContactableProspects(workspaceRestaurantId: string): Promise<number> {
  return countQualifiedProspects(workspaceRestaurantId);
}
