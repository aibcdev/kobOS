import type { Prisma } from "@prisma/client";

/** Matches the golden-lead profile: platform-first, rated, emailable. */
export function platformContactableWhere(workspaceRestaurantId: string): Prisma.LeadProspectWhereInput {
  return {
    workspaceRestaurantId,
    status: { not: "ARCHIVED" },
    contactEmail: { not: null },
    deliveryPlatforms: { isEmpty: false },
    rating: { gte: 4.0, lt: 4.6 },
    reviewCount: { gte: 50 },
  };
}
