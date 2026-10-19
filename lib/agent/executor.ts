import { NonRetriableError } from "inngest";
import type { ActionApprovedData } from "@/lib/agent/events";
import * as ledger from "@/lib/agent/ledger";
import { recomputeReliability } from "@/lib/agent/reliability";
import { actionAdapterFor, LONG_VERIFY_HOURS, VERIFY_WAITS, type ActionAdapter, type ExecuteResult } from "@/lib/agent/verify";
import { ConnectorError } from "@/lib/connectors/errors";
import { prisma } from "@/lib/db/prisma";

/** The slice of Inngest's step tools the executor uses (a fake in tests). */
export type ExecStep = {
  run<T>(id: string, fn: () => Promise<T>): Promise<T>;
  sleep(id: string, duration: string): Promise<unknown>;
  sleepUntil(id: string, until: Date | string): Promise<unknown>;
  sendEvent(id: string, payload: { name: string; data: Record<string, unknown> }): Promise<unknown>;
};

export type ExecOutcome =
  | { skipped: "already-claimed" }
  | { cancelled: true }
  | { status: "VERIFIED"; note?: "already_correct" }
  | { status: "FAILED"; code: string }
  | { status: "VERIFY_LATER" };

async function adapterOrFail(actionId: string, connector: string | null, resolve: (c: string | null) => ActionAdapter | null) {
  const adapter = resolve(connector);
  if (!adapter) throw new NonRetriableError(`No adapter for connector ${connector ?? "none"} (${actionId})`);
  return adapter;
}

/** After an inverse (undo) action verifies, close the action it undid. */
async function closeUndoneOriginal(actionId: string) {
  const link = await prisma.osDecisionEvidence.findFirst({ where: { actionId, evidenceType: "rollback.of" } });
  if (link?.sourceId) await ledger.markRolledBack(link.sourceId, actionId);
}

async function settle(actionId: string) {
  const a = await ledger.getAction(actionId);
  if (a) await recomputeReliability(a.restaurantId, a.actionType);
}

/**
 * Spec 1 §7.8. claim (once) → optional cool-off → recheck → precheck (already correct?) → execute (the only
 * provider write) → verify with backoff → VERIFIED, FAILED(VERIFY_MISMATCH), or hand off to the long verifier.
 */
export async function executeApprovedAction(
  data: ActionApprovedData,
  step: ExecStep,
  resolve: (connector: string | null) => ActionAdapter | null = actionAdapterFor,
): Promise<ExecOutcome> {
  const claimed = await step.run("claim", async () => {
    const a = await ledger.claim(data.actionId);
    return a ? { id: a.id, connector: a.connector, nextAttemptAt: a.nextAttemptAt?.toISOString() ?? null } : null;
  });
  if (!claimed) return { skipped: "already-claimed" };

  if (claimed.nextAttemptAt && new Date(claimed.nextAttemptAt) > new Date()) {
    await step.sleepUntil("cool-off", claimed.nextAttemptAt);
  }
  if (await step.run("recheck", () => ledger.isCancelled(claimed.id))) return { cancelled: true };

  const pre = await step.run("precheck", async () => {
    const adapter = await adapterOrFail(claimed.id, claimed.connector, resolve);
    return adapter.precheck((await ledger.getAction(claimed.id))!);
  });
  if (pre.alreadySatisfied) {
    await step.run("short-circuit", async () => {
      await ledger.markVerified(claimed.id, pre.evidence ?? {}, "already_correct");
      await closeUndoneOriginal(claimed.id);
      await settle(claimed.id);
    });
    return { status: "VERIFIED", note: "already_correct" };
  }

  const executed = await step.run("execute", async () => {
    const adapter = await adapterOrFail(claimed.id, claimed.connector, resolve);
    try {
      return await adapter.execute((await ledger.getAction(claimed.id))!);
    } catch (e) {
      if (e instanceof ConnectorError && !e.retriable) throw new NonRetriableError(`${e.code}: ${e.message}`, { cause: e });
      throw e;
    }
  });
  await step.run("executed", async () => {
    await ledger.markExecuted(claimed.id, executed);
    await ledger.markVerifying(claimed.id);
  });

  let pending = false;
  for (const wait of VERIFY_WAITS) {
    await step.sleep(`verify-wait-${wait}`, wait);
    const v = await step.run(`verify-${wait}`, async () => {
      const adapter = await adapterOrFail(claimed.id, claimed.connector, resolve);
      return adapter.verify((await ledger.getAction(claimed.id))!, executed as ExecuteResult);
    });
    if (v.verified) {
      await step.run("verified", async () => {
        await ledger.markVerified(claimed.id, v.evidence ?? {});
        await closeUndoneOriginal(claimed.id);
        await settle(claimed.id);
      });
      return { status: "VERIFIED" };
    }
    if (v.pendingProvider) {
      pending = true;
      break;
    }
  }

  if (pending) {
    await step.sendEvent("schedule-long-verify", { name: "kob/action.verify.later", data: { actionId: claimed.id } });
    return { status: "VERIFY_LATER" };
  }
  await step.run("verify-mismatch", async () => {
    await ledger.fail(claimed.id, "VERIFY_MISMATCH", "The change didn't read back as written.");
    await settle(claimed.id);
  });
  return { status: "FAILED", code: "VERIFY_MISMATCH" };
}

/** Inngest `onFailure`: retries exhausted or a non-retriable error. Leaves terminal actions alone. */
export async function failAfterRetries(actionId: string, error: unknown): Promise<void> {
  const a = await ledger.getAction(actionId);
  if (!a || ledger.TERMINAL.includes(a.status)) return;
  const cause = error instanceof Error ? error.message : String(error);
  const code = /^(AUTH|VALIDATION|NOT_FOUND|RATE_LIMIT|PROVIDER|NETWORK):/.exec(cause)?.[1] ?? "EXECUTE_FAILED";
  await ledger.fail(actionId, code, cause);
  await recomputeReliability(a.restaurantId, a.actionType);
}

/**
 * `kob-action-verify-later` body: re-verify actions still VERIFYING; after 72h mark FAILED(VERIFY_TIMEOUT).
 * Returns how many settled each way.
 */
export async function verifyPending(
  now = new Date(),
  resolve: (connector: string | null) => ActionAdapter | null = actionAdapterFor,
): Promise<{ verified: number; timedOut: number; stillPending: number }> {
  const rows = await prisma.osAction.findMany({ where: { status: "VERIFYING" }, take: 200, orderBy: { verificationStartedAt: "asc" } });
  const out = { verified: 0, timedOut: 0, stillPending: 0 };
  for (const a of rows) {
    const started = a.verificationStartedAt ?? a.updatedAt;
    const adapter = resolve(a.connector);
    const v = adapter ? await adapter.verify(a, (a.executedPayload ?? {}) as ExecuteResult).catch(() => null) : null;
    if (v?.verified) {
      await ledger.markVerified(a.id, v.evidence ?? {});
      await closeUndoneOriginal(a.id);
      await settle(a.id);
      out.verified++;
    } else if (now.getTime() - started.getTime() > LONG_VERIFY_HOURS * 3_600_000) {
      await ledger.fail(a.id, "VERIFY_TIMEOUT", `Not confirmed by the provider within ${LONG_VERIFY_HOURS}h.`);
      await settle(a.id);
      out.timedOut++;
    } else {
      out.stillPending++;
    }
  }
  return out;
}
