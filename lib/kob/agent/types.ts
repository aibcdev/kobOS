/**
 * Canonical operator turn — UI must not infer workflow from prose alone.
 */

export type KobTurnType =
  | "ANSWER"
  | "FINDING"
  | "ACTION_PROPOSAL"
  | "ACTION_PROGRESS"
  | "ACTION_RESULT"
  | "APPROVAL"
  | "NEEDS_CONNECTION"
  | "CLARIFICATION"
  | "RULE"
  | "UNSUPPORTED";

export type KobIntentKind =
  | "GENERAL"
  | "RESTAURANT_QUESTION"
  | "RESTAURANT_ACTION"
  | "APPROVAL"
  | "RULE_MEMORY"
  | "CONNECTION"
  | "UNSUPPORTED";

export type DataSource = {
  id: string
  kind: "store" | "demo" | "api" | "memory" | "none"
  label: string
  freshAt?: string
  status?: "LIVE" | "STALE" | "DISCONNECTED" | "ERROR" | "DEMO"
};

export type ToolCallRecord = {
  name: string
  status: "running" | "ok" | "error" | "skipped"
  detail?: string
};

export type KobActionChip = {
  id: string
  label: string
  kind: "approve" | "yes" | "ignore" | "connect" | "review"
  href?: string
};

export type KobCard = {
  id: string
  title: string
  body: string
  tone?: "default" | "warn" | "ok"
};

export type KobTurn = {
  id: string
  restaurantId: string
  intent: KobIntentKind
  type: KobTurnType
  message: string
  sources: DataSource[]
  toolCalls: ToolCallRecord[]
  confidence: number
  createdAt: string
  actions?: KobActionChip[]
  cards?: KobCard[]
  /** When true, UI must not replace this with an LLM rewrite. */
  grounded: boolean
  /** Internal — for debug / metrics */
  meta?: {
    genericFallbackBlocked?: boolean
    actionVerbDetected?: boolean
    toolsRequired?: string[]
  }
};

export type ActionLifecycle =
  | "DETECTED"
  | "PROPOSED"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "EXECUTING"
  | "EXECUTED"
  | "VERIFYING"
  | "VERIFIED"
  | "FAILED"
  | "REJECTED"
  | "ROLLED_BACK";
