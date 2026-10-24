import type { OsAction } from "@prisma/client";
import type { Connector } from "@/lib/agent/action-types";

export type Evidence = Record<string, unknown>;

export type PrecheckResult = { alreadySatisfied: boolean; evidence?: Evidence };
export type ExecuteResult = Evidence;
export type VerifyResult = {
  verified: boolean;
  evidence?: Evidence;
  /** The provider accepted the write but is still reviewing it (e.g. Google moderation): verify later. */
  pendingProvider?: boolean;
};

/**
 * One per connector. `execute` is the only provider write; it throws `ConnectorError` (AUTH/VALIDATION are not
 * retried). "Done" is only ever shown after `verify` reads the change back.
 */
export interface ActionAdapter {
  precheck(action: OsAction): Promise<PrecheckResult>;
  execute(action: OsAction): Promise<ExecuteResult>;
  verify(action: OsAction, executed: ExecuteResult): Promise<VerifyResult>;
}

const registry = new Map<string, ActionAdapter>();

/** Connectors register their adapter here (GBP in T-20, POS in T-88, …). */
export function registerActionAdapter(connector: Connector | string, adapter: ActionAdapter): void {
  registry.set(connector, adapter);
}

export function actionAdapterFor(connector: string | null | undefined): ActionAdapter | null {
  return connector ? (registry.get(connector) ?? null) : null;
}

export function clearActionAdapters(): void {
  registry.clear();
}

/** Short verify waits after the write; afterwards `kob-action-verify-later` keeps checking for up to 72h. */
export const VERIFY_WAITS = ["2s", "5s", "15s", "45s", "2m"] as const;
export const LONG_VERIFY_HOURS = 72;
