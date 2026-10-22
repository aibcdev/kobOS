import type { OsAction, OsGrantScope, OsPermissionGrant } from "@prisma/client";
import { ACTION_TYPE_SPECS, isActionType } from "@/lib/agent/action-types";
import { prisma } from "@/lib/db/prisma";

export const TASK_GRANT_HOURS = 24;

const LIMIT_KEYS = ["minRating", "maxPerDay", "excludeSeverityGte"] as const;
export type GrantLimits = Partial<Record<(typeof LIMIT_KEYS)[number], number>>;

export class GrantError extends Error {
  constructor(readonly code: "task_key_required" | "not_always_eligible" | "unknown_action_type") {
    super(code);
    this.name = "GrantError";
  }
}

/** Registry defaults overlaid with the owner's choices from the "Always do this" sheet. */
export function alwaysLimits(actionType: string, requested: Record<string, unknown> = {}): GrantLimits {
  const defaults = isActionType(actionType) ? (ACTION_TYPE_SPECS[actionType].alwaysLimits ?? {}) : {};
  const base: GrantLimits = { ...defaults };
  for (const key of LIMIT_KEYS) {
    const v = requested[key];
    // Rating/severity limits only apply to action types that define them (reviews); maxPerDay applies to all.
    if (key !== "maxPerDay" && !(key in defaults)) continue;
    if (typeof v === "number" && Number.isFinite(v)) base[key] = v;
  }
  return base;
}

/** Throws GrantError when the scope can't apply to this action; call before approving. */
export function assertGrantable(action: OsAction, scope: OsGrantScope): void {
  if (!isActionType(action.actionType)) throw new GrantError("unknown_action_type");
  if (scope === "TASK" && !action.taskKey) throw new GrantError("task_key_required");
  if (scope === "ALWAYS" && !ACTION_TYPE_SPECS[action.actionType].alwaysEligible) throw new GrantError("not_always_eligible");
}

/**
 * Records the approval scope. ALWAYS is mirrored into OsActionPermission(AUTO_WITH_LIMITS) so `authorised()` in
 * lib/os/permissions.ts stays the single decision function for legacy callers.
 */
export async function grantFromApproval(
  action: OsAction,
  userId: string,
  scope: OsGrantScope,
  requestedLimits?: Record<string, unknown>,
  now = new Date(),
): Promise<OsPermissionGrant> {
  assertGrantable(action, scope);
  const connector = action.connector ?? (isActionType(action.actionType) ? ACTION_TYPE_SPECS[action.actionType].connector : "");
  const limits = scope === "ALWAYS" ? alwaysLimits(action.actionType, requestedLimits) : {};
  return prisma.$transaction(async (tx) => {
    const grant = await tx.osPermissionGrant.create({
      data: {
        restaurantId: action.restaurantId,
        actionType: action.actionType,
        connector,
        scope,
        taskKey: scope === "TASK" ? action.taskKey : null,
        actionId: scope === "ONCE" ? action.id : null,
        limitsJson: limits,
        grantedByUserId: userId,
        grantedAt: now,
        expiresAt: scope === "TASK" ? new Date(now.getTime() + TASK_GRANT_HOURS * 3_600_000) : null,
      },
    });
    if (scope === "ALWAYS") {
      await tx.osActionPermission.upsert({
        where: { restaurantId_actionType_category: { restaurantId: action.restaurantId, actionType: action.actionType, category: "" } },
        create: { restaurantId: action.restaurantId, actionType: action.actionType, mode: "AUTO_WITH_LIMITS" },
        update: { mode: "AUTO_WITH_LIMITS" },
      });
    }
    await tx.osAuditEvent.create({
      data: {
        restaurantId: action.restaurantId,
        actionId: action.id,
        kind: "grant.created",
        payload: { grantId: grant.id, scope, limits },
      },
    });
    return grant;
  });
}

/** Grants still in force: not revoked, and (TASK) not expired. ONCE grants are spent by their action, so excluded. */
export async function activeGrants(restaurantId: string, now = new Date()): Promise<OsPermissionGrant[]> {
  return prisma.osPermissionGrant.findMany({
    where: {
      restaurantId,
      revokedAt: null,
      scope: { in: ["TASK", "ALWAYS"] },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { grantedAt: "desc" },
  });
}

/**
 * Revokes a grant. Revoking the last ALWAYS grant for an action type puts its OsActionPermission back to ASK, so the
 * next proposal of that type waits for the owner again. Idempotent: a revoked grant is returned unchanged.
 */
export async function revokeGrant(grantId: string, userId: string, now = new Date()): Promise<OsPermissionGrant> {
  return prisma.$transaction(async (tx) => {
    const grant = await tx.osPermissionGrant.findUniqueOrThrow({ where: { id: grantId } });
    if (grant.revokedAt) return grant;
    const revoked = await tx.osPermissionGrant.update({ where: { id: grantId }, data: { revokedAt: now } });
    let permissionReset = false;
    if (grant.scope === "ALWAYS") {
      const stillAlways = await tx.osPermissionGrant.count({
        where: { restaurantId: grant.restaurantId, actionType: grant.actionType, scope: "ALWAYS", revokedAt: null },
      });
      if (stillAlways === 0) {
        const reset = await tx.osActionPermission.updateMany({
          where: { restaurantId: grant.restaurantId, actionType: grant.actionType, category: "", mode: { in: ["AUTO_WITH_LIMITS", "AUTOPILOT"] } },
          data: { mode: "ASK" },
        });
        permissionReset = reset.count > 0;
      }
    }
    await tx.osAuditEvent.create({
      data: {
        restaurantId: grant.restaurantId,
        kind: "grant.revoked",
        payload: { grantId, scope: grant.scope, actionType: grant.actionType, taskKey: grant.taskKey, byUserId: userId, permissionReset },
      },
    });
    return revoked;
  });
}
