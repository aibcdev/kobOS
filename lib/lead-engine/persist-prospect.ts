import { LeadBusinessType, LeadProspectStatus, type Prisma } from "@prisma/client";
import { platformContactableWhere } from "@/lib/lead-engine/contactable-query";
import { hostFromWebsiteUrl } from "@/lib/outbound/chain-denylist";
import type { MergedPlatformLead } from "@/lib/lead-engine/merge-platform-listings";
import type { GoogleEnrichedLead } from "@/lib/lead-engine/google-enrich";
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
    where: { workspaceRestaurantId, canonicalKey },
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
    where: { workspaceRestaurantId, OR: or },
    select: { id: true },
  });
  return Boolean(existing);
}

export async function persistPlatformLead(
  workspaceRestaurantId: string,
  platform: MergedPlatformLead,
  google: GoogleEnrichedLead,
  email: { email: string; source: string } | null,
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
    reviewCount: google.reviewCount,
    rating: google.rating,
    lastReviewAt: google.lastReviewAt,
    deliveryPlatforms: platform.deliveryPlatforms,
    platformRank: platform.platformRank,
    platformRankPercentile: platform.platformRankPercentile,
    platformRegion: platform.platformRegion,
    contactEmail: email?.email ?? null,
    enrichmentSource: email?.source ?? null,
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
      reviewCount: google.reviewCount,
      rating: google.rating,
      lastReviewAt: google.lastReviewAt,
      deliveryPlatforms: platform.deliveryPlatforms,
      platformRank: platform.platformRank,
      platformRankPercentile: platform.platformRankPercentile,
      platformRegion: platform.platformRegion,
      formattedAddress: google.formattedAddress || platform.address,
      ...(email ? { contactEmail: email.email, enrichmentSource: email.source } : {}),
    },
  });
}

export async function countContactableProspects(workspaceRestaurantId: string): Promise<number> {
  return prisma.leadProspect.count({
    where: platformContactableWhere(workspaceRestaurantId),
  });
}
