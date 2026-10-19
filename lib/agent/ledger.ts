import { createHash } from "node:crypto";
import { Prisma, type OsAction, type OsActionStatus } from "@prisma/client";
import { ActionPayload, actionTarget } from "@/lib/agent/action-payloads";
import { ACTION_TYPE_SPECS, riskFor, type ActionType } from "@/lib/agent/action-types";
import { prisma } from "@/lib/db/prisma";
import { idempotencyKey } from "@/lib/os/idempotency";

/** Spec 1 §14.2. Anything not listed here throws `LedgerTransitionError`. */
export const TRANSITIONS: Record<OsActionStatus, readonly OsActionStatus[]> = {
  DETECTED: ["PROPOSED", "FAILED"],
  PROPOSED: ["AWAITING_APPROVAL", "APPROVED", "REJECTED", "FAILED"],
  AWAITING_APPROVAL: ["APPROVED", "REJECTED", "FAILED"],
  APPROVED: ["EXECUTING", "REJECTED", "FAILED"],
  // EXECUTING → VERIFIED is the "already correct" short-circuit: the precheck found the desired state.
  EXECUTING: ["EXECUTED", "VERIFIED", "FAILED"],
  EXECUTED: ["VERIFYING", "FAILED", "ROLLED_BACK"],
  VERIFYING: ["VERIFIED", "FAILED"],
  VERIFIED: ["ROLLED_BACK"],
  FAILED: [],
  REJECTED: [],
  ROLLED_BACK: [],
};

export const TERMINAL: readonly OsActionStatus[] = ["VERIFIED", "FAILED", "REJECTED", "ROLLED_BACK"];

export class LedgerTransitionError extends Error {
  constructor(
    readonly actionId: string,
    readonly from: OsActionStatus | "missing",
    readonly to: OsActionStatus,
  ) {
    super(`Illegal action transition ${from} → ${to} for ${actionId}`);
    this.name = "LedgerTransitionError";
  }
}

export function canTransition(from: OsActionStatus, to: OsActionStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export type ProposalInput = {
  restaurantId: string;
  title: string;
  summary?: string;
  /** Validated against `ActionPayload` for its `actionType`. */
  payload: unknown;
  locationId?: string | null;
  taskKey?: string | null;
  channelOrigin?: "WEB" | "WHATSAPP" | "SCHEDULE" | "EVENT";
  requestedByUserId?: string | null;
  agentRunId?: string | null;
  confidence?: number;
  evidence?: { type: string; source: string; sourceId?: string; note?: string }[];
  rollbackPayload?: Record<string, unknown> | null;
  /** Dedup window; proposing the same change in the same window returns the existing row. Defaults to the UTC day. */
  window?: string;
  now?: Date;
};

type Tx = Prisma.TransactionClient;

async function audit(tx: Tx, action: Pick<OsAction, "id" | "restaurantId">, kind: string, payload: Record<string, unknown> = {}) {
  await tx.osAuditEvent.create({
    data: { restaurantId: action.restaurantId, actionId: action.id, kind, payload: payload as Prisma.InputJsonValue },
  });
}

/** Creates the action in AWAITING_APPROVAL, or returns the existing row for a duplicate proposal. */
export async function createProposal(input: ProposalInput): Promise<OsAction> {
  const payload = ActionPayload.parse(input.payload);
  const actionType = payload.actionType as ActionType;
  const spec = ACTION_TYPE_SPECS[actionType];
  const now = input.now ?? new Date();
  const key = idempotencyKey({
    restaurantId: input.restaurantId,
    locationId: input.locationId,
    actionType,
    target: actionTarget(payload),
    desired: createHash("sha256").update(stableJson(payload)).digest("hex").slice(0, 16),
    window: input.window ?? now.toISOString().slice(0, 10),
  });

  try {
    return await prisma.$transaction(async (tx) => {
      const action = await tx.osAction.create({
        data: {
          restaurantId: input.restaurantId,
          locationId: input.locationId ?? undefined,
          actionType,
          connector: spec.connector,
          status: "AWAITING_APPROVAL",
          title: input.title,
          description: input.summary ?? "",
          ownerFacingSummary: input.summary ?? input.title,
          proposedPayload: payload as Prisma.InputJsonValue,
          riskScore: riskFor(actionType),
          confidenceScore: input.confidence ?? 0,
          requiresApproval: true,
          rollbackSupported: spec.undoHours > 0,
          rollbackPayload: (input.rollbackPayload ?? undefined) as Prisma.InputJsonValue | undefined,
          idempotencyKey: key,
          taskKey: input.taskKey ?? undefined,
          channelOrigin: input.channelOrigin ?? "WEB",
          requestedByUserId: input.requestedByUserId ?? undefined,
          agentRunId: input.agentRunId ?? undefined,
          expiresAt: new Date(now.getTime() + spec.expiresHours * 3_600_000),
        },
      });
      if (input.evidence?.length) {
        await tx.osDecisionEvidence.createMany({
          data: input.evidence.map((e) => ({
            actionId: action.id,
            evidenceType: e.type,
            source: e.source,
            sourceId: e.sourceId,
            valueJson: e.note ? { note: e.note } : {},
          })),
        });
      }
      await audit(tx, action, "action.proposed", { actionType, risk: action.riskScore, taskKey: action.taskKey });
      return action;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const existing = await prisma.osAction.findUnique({
        where: { restaurantId_idempotencyKey: { restaurantId: input.restaurantId, idempotencyKey: key } },
      });
      if (existing) return existing;
    }
    throw e;
  }
}

/**
 * Atomic compare-and-set: moves the action from one of `from` to `to` and writes the audit event in the same
 * transaction. Throws `LedgerTransitionError` when the row is in any other state.
 */
export async function transition(
  actionId: string,
  from: readonly OsActionStatus[],
  to: OsActionStatus,
  opts: { data?: Prisma.OsActionUpdateManyMutationInput; auditKind: string; auditPayload?: Record<string, unknown> },
): Promise<OsAction> {
  for (const f of from) if (!canTransition(f, to)) throw new LedgerTransitionError(actionId, f, to);
  return prisma.$transaction(async (tx) => {
    const res = await tx.osAction.updateMany({
      where: { id: actionId, status: { in: [...from] } },
      data: { ...opts.data, status: to },
    });
    const row = await tx.osAction.findUnique({ where: { id: actionId } });
    if (!row) throw new LedgerTransitionError(actionId, "missing", to);
    if (res.count === 0) throw new LedgerTransitionError(actionId, row.status, to);
    await audit(tx, row, opts.auditKind, { from, to, ...opts.auditPayload });
    return row;
  });
}

export async function getAction(actionId: string): Promise<OsAction | null> {
  return prisma.osAction.findUnique({ where: { id: actionId } });
}

/** Owner (or policy, with `approvedBy: "policy"`) says yes. Approving an already-approved action is a no-op. */
export async function approve(actionId: string, approvedBy: string): Promise<OsAction> {
  const current = await getAction(actionId);
  if (!current) throw new LedgerTransitionError(actionId, "missing", "APPROVED");
  if (current.status !== "AWAITING_APPROVAL" && current.status !== "PROPOSED") {
    if (current.approvedAt) return current;
    throw new LedgerTransitionError(actionId, current.status, "APPROVED");
  }
  return transition(actionId, ["AWAITING_APPROVAL", "PROPOSED"], "APPROVED", {
    data: { approvedBy, approvedAt: new Date() },
    auditKind: "action.approved",
    auditPayload: { by: approvedBy },
  });
}

export async function reject(actionId: string, by: string, reason: string): Promise<OsAction> {
  return transition(actionId, ["AWAITING_APPROVAL", "PROPOSED", "APPROVED"], "REJECTED", {
    data: { failureCode: "REJECTED", failureReason: reason.slice(0, 500) },
    auditKind: "action.rejected",
    auditPayload: { by, reason },
  });
}

/** APPROVED → EXECUTING exactly once. A second caller gets null. */
export async function claim(actionId: string): Promise<OsAction | null> {
  try {
    return await transition(actionId, ["APPROVED"], "EXECUTING", {
      data: { executionStartedAt: new Date(), attempt: { increment: 1 } },
      auditKind: "action.executing",
    });
  } catch (e) {
    if (e instanceof LedgerTransitionError) return null;
    throw e;
  }
}

export async function markExecuted(actionId: string, executed: Record<string, unknown>): Promise<OsAction> {
  return transition(actionId, ["EXECUTING"], "EXECUTED", {
    data: { executedPayload: executed as Prisma.InputJsonValue, executionCompletedAt: new Date() },
    auditKind: "action.executed",
  });
}

export async function markVerifying(actionId: string): Promise<OsAction> {
  return transition(actionId, ["EXECUTED"], "VERIFYING", {
    data: { verificationStartedAt: new Date() },
    auditKind: "action.verifying",
  });
}

export async function markVerified(
  actionId: string,
  evidence: Record<string, unknown>,
  note?: "already_correct",
): Promise<OsAction> {
  const current = await getAction(actionId);
  const spec = current && ACTION_TYPE_SPECS[current.actionType as ActionType];
  const now = new Date();
  return transition(actionId, note === "already_correct" ? ["EXECUTING"] : ["VERIFYING"], "VERIFIED", {
    data: {
      verificationPayload: { ...evidence, ...(note ? { note } : {}) } as Prisma.InputJsonValue,
      verifiedAt: now,
      undoUntil: spec?.undoHours ? new Date(now.getTime() + spec.undoHours * 3_600_000) : null,
    },
    auditKind: "action.verified",
    auditPayload: note ? { note } : {},
  });
}

const FAILABLE: OsActionStatus[] = ["DETECTED", "PROPOSED", "AWAITING_APPROVAL", "APPROVED", "EXECUTING", "EXECUTED", "VERIFYING"];

export async function fail(actionId: string, code: string, reason: string): Promise<OsAction> {
  return transition(actionId, FAILABLE, "FAILED", {
    data: { failureCode: code.slice(0, 80), failureReason: reason.slice(0, 500) },
    auditKind: "action.failed",
    auditPayload: { code },
  });
}

export async function markRolledBack(actionId: string, byActionId: string): Promise<OsAction> {
  return transition(actionId, ["VERIFIED", "EXECUTED"], "ROLLED_BACK", {
    auditKind: "action.rolled_back",
    auditPayload: { byActionId },
  });
}

/** Owner hit Stop / Skip, or it already failed, while the executor was waiting. */
export async function isCancelled(actionId: string): Promise<boolean> {
  const a = await getAction(actionId);
  return !a || a.status === "REJECTED" || a.status === "FAILED" || a.status === "ROLLED_BACK";
}
