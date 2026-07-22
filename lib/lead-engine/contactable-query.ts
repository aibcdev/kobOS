import type { Prisma } from "@prisma/client";
import { getLeadEngineConfig } from "@/lib/lead-engine/config";

function platformBaseParts(workspaceRestaurantId: string) {
  const icp = getLeadEngineConfig();
  const topPct = icp.platformTopPct / 100;
  return { icp, topPct, workspaceRestaurantId };
}

/** Top 20% on delivery apps, 50+ reviews — full prospect list. */
export function platformFoundWhere(workspaceRestaurantId: string): Prisma.LeadProspectWhereInput {
  const { icp, topPct } = platformBaseParts(workspaceRestaurantId);
  return {
    workspaceRestaurantId,
    status: { not: "ARCHIVED" },
    deliveryPlatforms: { isEmpty: false },
    platformRankPercentile: { lte: topPct },
    reviewCount: { gt: icp.googleReviewMin - 1 },
    AND: [{ OR: [{ locationCount: null }, { locationCount: { lte: icp.locationMax } }] }],
  };
}

/** Found + email — ready for email outreach (phone-only rows excluded). */
export function platformQualifiedWhere(workspaceRestaurantId: string): Prisma.LeadProspectWhereInput {
  const { icp, topPct, workspaceRestaurantId: ws } = platformBaseParts(workspaceRestaurantId);
  return {
    workspaceRestaurantId: ws,
    status: { not: "ARCHIVED" },
    deliveryPlatforms: { isEmpty: false },
    platformRankPercentile: { lte: topPct },
    reviewCount: { gt: icp.googleReviewMin - 1 },
    contactEmail: { not: null },
    AND: [{ OR: [{ locationCount: null }, { locationCount: { lte: icp.locationMax } }] }],
  };
}

/** Alias — email-ready prospects for outbound. */
export function platformEmailReadyWhere(workspaceRestaurantId: string): Prisma.LeadProspectWhereInput {
  return platformQualifiedWhere(workspaceRestaurantId);
}

export function platformContactableWhere(workspaceRestaurantId: string): Prisma.LeadProspectWhereInput {
  return platformQualifiedWhere(workspaceRestaurantId);
}
