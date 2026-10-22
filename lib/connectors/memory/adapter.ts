import type { OsAction } from "@prisma/client";
import type { ActionPayload } from "@/lib/agent/action-payloads";
import type { ActionAdapter } from "@/lib/agent/verify";
import { ConnectorError } from "@/lib/connectors/errors";
import { createInMemoryHoursAdapter, type HoursState } from "@/lib/os/adapters/hours-memory";

export type MemoryAdapterOptions = {
  failExecute?: "AUTH" | "PROVIDER";
  /** Verify reads back something other than what was written. */
  driftAfterWrite?: boolean;
  /** Provider holds the edit for review; verify never confirms. */
  pending?: boolean;
};

/**
 * Ledger adapter over the in-memory hours store (`lib/os/adapters/hours-memory.ts`). Handles the GBP hours
 * action types and counts provider writes, so tests can prove the pipeline writes exactly once.
 */
export function createMemoryActionAdapter(initial: HoursState, opts: MemoryAdapterOptions = {}) {
  const store = createInMemoryHoursAdapter(initial);
  let writes = 0;

  const desired = (action: OsAction): { op: string; payload: Record<string, unknown>; expected: Record<string, unknown> } => {
    const p = action.proposedPayload as ActionPayload;
    if (p.actionType === "gbp.hours.regular.update") {
      const first = p.periods[0];
      const payload = { open: first?.open, close: first?.close };
      return { op: "SET_HOURS", payload, expected: payload };
    }
    if (p.actionType === "gbp.hours.special.set") {
      const closedDates = p.days.filter((d) => d.closed).map((d) => d.date);
      return { op: "TEMPORARY_CLOSURE", payload: { date: closedDates[0] }, expected: { open: "keep", closedDates } };
    }
    throw new ConnectorError("VALIDATION", `memory adapter can't run ${p.actionType}`);
  };

  const adapter: ActionAdapter = {
    async precheck(action) {
      const v = await store.verify(desired(action).expected);
      return { alreadySatisfied: v.matchesExpected, evidence: v.observed };
    },
    async execute(action) {
      if (opts.failExecute) throw new ConnectorError(opts.failExecute, "memory provider refused the write");
      const { op, payload } = desired(action);
      writes++;
      const res = await store.execute(op, payload);
      if (!res.ok) throw new ConnectorError("PROVIDER", res.reason ?? "write failed");
      if (opts.driftAfterWrite) await store.execute("SET_HOURS", { open: "00:00", close: "00:01" });
      return { written: res.payload ?? {} };
    },
    async verify(action) {
      if (opts.pending) return { verified: false, pendingProvider: true };
      const v = await store.verify(desired(action).expected);
      return { verified: v.matchesExpected, evidence: v.observed };
    },
  };

  return { adapter, snapshot: store.snapshot, writes: () => writes };
}
