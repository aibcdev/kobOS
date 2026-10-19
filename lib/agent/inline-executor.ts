import type { ActionApprovedData } from "@/lib/agent/events";
import { executeApprovedAction, failAfterRetries, type ExecStep } from "@/lib/agent/executor";
import { actionAdapterFor, type ActionAdapter } from "@/lib/agent/verify";
import { createMemoryActionAdapter } from "@/lib/connectors/memory/adapter";

/**
 * Dev/e2e only: run approved actions in-process instead of through Inngest, against the memory adapter when a
 * connector has no real adapter. Never on in production.
 */
export function inlineActionsEnabled(): boolean {
  if (process.env.NODE_ENV === "production" || process.env.CONTEXT === "production") return false;
  return process.env.KOB_INLINE_ACTIONS === "1";
}

const globalMemory = globalThis as unknown as { kobInlineMemory?: ActionAdapter };

function memoryAdapter(): ActionAdapter {
  globalMemory.kobInlineMemory ??= createMemoryActionAdapter({ open: "12:00", close: "22:00" }).adapter;
  return globalMemory.kobInlineMemory;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Fire-and-forget; each verify wait is a short real delay so the UI can be seen moving through states. */
export function runActionInline(data: ActionApprovedData): void {
  const delay = Number(process.env.KOB_INLINE_STEP_MS ?? 600);
  const step: ExecStep = {
    run: (_id, fn) => fn(),
    sleep: () => sleep(delay),
    sleepUntil: async (_id, until) => sleep(Math.max(0, new Date(until).getTime() - Date.now())),
    sendEvent: async () => undefined,
  };
  void (async () => {
    await sleep(delay);
    try {
      await executeApprovedAction(data, step, (connector) => actionAdapterFor(connector) ?? memoryAdapter());
    } catch (e) {
      await failAfterRetries(data.actionId, e).catch(() => undefined);
    }
  })();
}
