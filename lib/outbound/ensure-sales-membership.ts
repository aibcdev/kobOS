import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";
import { isOutboundSalesMode } from "@/lib/outbound/sales-access";

/** Ensures the logged-in user can access the KOB sales workspace (UK cold / Today). */
export async function ensureSalesWorkspaceMembership(userId: string): Promise<void> {
  if (isUiPreviewEnabled()) return;
  if (!isOutboundSalesMode()) return;

  const workspaceId = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
  if (!workspaceId) return;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: workspaceId },
    select: { id: true },
  });
  if (!restaurant) return;

  await prisma.teamMember.upsert({
    where: { userId_restaurantId: { userId, restaurantId: workspaceId } },
    create: { userId, restaurantId: workspaceId, role: Role.OWNER },
    update: { role: Role.OWNER },
  });
}
