import type { OsAction } from "@prisma/client";
import { inngest } from "@/inngest/client";
import { inlineActionsEnabled, runActionInline } from "@/lib/agent/inline-executor";

export const ACTION_APPROVED_EVENT = "kob/action.approved";
export const ACTION_VERIFY_LATER_EVENT = "kob/action.verify.later";

export type ActionApprovedData = { actionId: string; restaurantId: string; connectorKey: string };

/** Hands an approved action to the executor. The event id dedupes repeat sends for the same approval. */
export async function sendActionApproved(action: Pick<OsAction, "id" | "restaurantId" | "connector" | "attempt">) {
  const data: ActionApprovedData = {
    actionId: action.id,
    restaurantId: action.restaurantId,
    connectorKey: `${action.restaurantId}:${action.connector ?? "none"}`,
  };
  if (inlineActionsEnabled()) return runActionInline(data);
  await inngest.send({ id: `action-approved-${action.id}-${action.attempt}`, name: ACTION_APPROVED_EVENT, data });
}
