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

/** Connecting, replacing or removing a data source is owner/admin only. Preview restaurants never connect. */
export async function canManageConnections(userId: string, restaurantId: string): Promise<"ok" | "not_member" | "forbidden"> {
  const m = await prisma.teamMember.findUnique({ where: { userId_restaurantId: { userId, restaurantId } }, select: { role: true } });
  if (!m) return "not_member";
  return m.role === "OWNER" || m.role === "ADMIN" ? "ok" : "forbidden";
}
