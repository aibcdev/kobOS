import type { Restaurant } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  getPreviewMemberships,
  getPreviewRestaurant,
  isUiPreviewEnabled,
  PREVIEW_RESTAURANT_ID,
} from "@/lib/preview/ui-preview";

export async function getActiveRestaurantContext(userId: string, rParam?: string | null) {
  if (isUiPreviewEnabled()) {
    const memberships = getPreviewMemberships();
    const restaurantId =
      rParam && memberships.some((m) => m.restaurantId === rParam) ? rParam : PREVIEW_RESTAURANT_ID;
    const restaurant =
      memberships.find((m) => m.restaurantId === restaurantId)?.restaurant ?? getPreviewRestaurant();
    return { memberships, restaurantId, restaurant };
  }

  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    include: { restaurant: true },
    orderBy: { createdAt: "asc" },
  });

  if (!memberships.length) {
    return {
      memberships,
      restaurantId: null as string | null,
      restaurant: null as Restaurant | null,
    };
  }

  const restaurantId =
    rParam && memberships.some((m) => m.restaurantId === rParam) ? rParam : memberships[0]!.restaurantId;

  const restaurant = memberships.find((m) => m.restaurantId === restaurantId)!.restaurant;

  return { memberships, restaurantId, restaurant };
}
