import { prisma } from "@/lib/db/prisma";

export async function assertRestaurantMembership(
  userId: string,
  restaurantId: string,
): Promise<boolean> {
  const m = await prisma.teamMember.findUnique({
    where: { userId_restaurantId: { userId, restaurantId } },
  });
  return Boolean(m);
}
