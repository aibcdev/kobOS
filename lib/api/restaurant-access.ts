import { prisma } from "@/lib/db/prisma";
import { isPreviewRestaurantId } from "@/lib/preview/ui-preview";

export async function assertRestaurantMembership(
  userId: string,
  restaurantId: string,
): Promise<boolean> {
  if (isPreviewRestaurantId(restaurantId)) return true;

  const m = await prisma.teamMember.findUnique({
    where: { userId_restaurantId: { userId, restaurantId } },
  });
  return Boolean(m);
}
