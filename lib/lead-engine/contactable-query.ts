import type { Prisma } from "@prisma/client";
import { getLeadEngineConfig } from "@/lib/lead-engine/config";

function platformBaseParts(workspaceRestaurantId: string) {
  const icp = getLeadEngineConfig();
  const topPct = icp.platformTopPct / 100;
  return { icp, topPct, workspaceRestaurantId };
}

/** Top 20% on delivery apps, 50+ reviews — full prospect list (location may be unknown until analyzed). */
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

/**
 * Email-ready for outreach: must have 1..locationMax locations (hard ≤5 by default).
 * Unknown location counts are excluded until the analyzer fills them.
 */
export function platformQualifiedWhere(workspaceRestaurantId: string): Prisma.LeadProspectWhereInput {
  const { icp, topPct, workspaceRestaurantId: ws } = platformBaseParts(workspaceRestaurantId);
  return {
    workspaceRestaurantId: ws,
    status: { not: "ARCHIVED" },
    deliveryPlatforms: { isEmpty: false },
    platformRankPercentile: { lte: topPct },
    reviewCount: { gt: icp.googleReviewMin - 1 },
    contactEmail: { not: null },
    locationCount: { gte: 1, lte: icp.locationMax },
  };
}

/** Alias — email-ready prospects for outbound. */
export function platformEmailReadyWhere(workspaceRestaurantId: string): Prisma.LeadProspectWhereInput {
  return platformQualifiedWhere(workspaceRestaurantId);
}

export function platformContactableWhere(workspaceRestaurantId: string): Prisma.LeadProspectWhereInput {
  return platformQualifiedWhere(workspaceRestaurantId);
}
