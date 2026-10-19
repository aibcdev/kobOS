import type { OsAction, TeamMember } from "@prisma/client";
import { ACTION_TYPE_SPECS, isActionType } from "@/lib/agent/action-types";
import { prisma } from "@/lib/db/prisma";
import { ownerFacingStatus } from "@/lib/os/gates";

/** The action and the caller's membership, or null when either is missing (callers answer 404, never 403). */
export async function loadActionForUser(
  userId: string,
  actionId: string,
): Promise<{ action: OsAction; member: TeamMember } | null> {
  const action = await prisma.osAction.findUnique({ where: { id: actionId } });
  if (!action) return null;
  const member = await prisma.teamMember.findUnique({
    where: { userId_restaurantId: { userId, restaurantId: action.restaurantId } },
  });
  return member ? { action, member } : null;
}

/** Risk at or above this needs slide-to-commit on approve. */
export const SLIDE_RISK = 51;

export type ActionView = {
  id: string;
  restaurantId: string;
  actionType: string;
  title: string;
  summary: string;
  status: string;
  ownerStatus: string;
  risk: number;
  requiresSlide: boolean;
  alwaysEligible: boolean;
  taskKey: string | null;
  createdAt: string;
  expiresAt: string | null;
  verifiedAt: string | null;
  undoUntil: string | null;
  failureReason: string | null;
};

export function actionView(a: OsAction): ActionView {
  return {
    id: a.id,
    restaurantId: a.restaurantId,
    actionType: a.actionType,
    title: a.title,
    summary: a.ownerFacingSummary || a.description,
    status: a.status,
    ownerStatus: ownerFacingStatus(a.status),
    risk: a.riskScore,
    requiresSlide: a.riskScore >= SLIDE_RISK,
    alwaysEligible: isActionType(a.actionType) && ACTION_TYPE_SPECS[a.actionType].alwaysEligible,
    taskKey: a.taskKey,
    createdAt: a.createdAt.toISOString(),
    expiresAt: a.expiresAt?.toISOString() ?? null,
    verifiedAt: a.verifiedAt?.toISOString() ?? null,
    undoUntil: a.undoUntil?.toISOString() ?? null,
    failureReason: a.failureReason,
  };
}
