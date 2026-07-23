import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";
import {
  isOutboundSalesAllowlisted,
  isOutboundSalesMode,
} from "@/lib/outbound/sales-access";

/**
 * Ensures allowlisted sales operators can access the KOB sales workspace.
 * Fail closed: OUTBOUND_SALES_MODE alone does not grant access — require OUTBOUND_SALES_ALLOWLIST.
 */
export async function ensureSalesWorkspaceMembership(
  userId: string,
  email?: string | null,
): Promise<void> {
  if (isUiPreviewEnabled()) return;
  if (!isOutboundSalesMode()) return;
  if (!isOutboundSalesAllowlisted(email)) return;

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
