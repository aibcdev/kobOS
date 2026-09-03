import { prisma } from "@/lib/db/prisma";
import { getPreviewRestaurant, isPreviewRestaurantId } from "@/lib/preview/ui-preview";

export async function getRestaurantForMember(userId: string, restaurantId: string) {
  if (isPreviewRestaurantId(restaurantId)) return getPreviewRestaurant();

  const m = await prisma.teamMember.findUnique({
    where: { userId_restaurantId: { userId, restaurantId } },
    include: { restaurant: true },
  });
  return m?.restaurant ?? null;
}
