import { prisma } from "@/lib/db/prisma";

export async function getRestaurantForMember(userId: string, restaurantId: string) {
  const m = await prisma.teamMember.findUnique({
    where: { userId_restaurantId: { userId, restaurantId } },
    include: { restaurant: true },
  });
  return m?.restaurant ?? null;
}
