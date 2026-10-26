import type { OsAction } from "@prisma/client";
import { ACTION_TYPE_SPECS, isActionType } from "@/lib/agent/action-types";
import { flag } from "@/lib/flags";

/**
 * How an approved Google change goes out. "auto": KOB writes it to Google and reads it back (GBP_LIVE on, after
 * Google approves API access). "assisted": the owner approves, KOB copies the words and opens Google, the owner posts
 * it and says so. Turning GBP_LIVE on switches back to auto with no code change.
 */
export type PublishMode = "auto" | "assisted";

export async function publishMode(restaurantId: string | null | undefined): Promise<PublishMode> {
  return (await flag("GBP_LIVE", restaurantId)) ? "auto" : "assisted";
}

export function isGoogleAction(actionType: string): boolean {
  return isActionType(actionType) && ACTION_TYPE_SPECS[actionType].connector === "GBP";
}

/** The local id a hand-added review gets (lib/agent/review-reply.ts); Google has no such review to write to. */
export const LOCAL_REVIEW_PREFIX = "kob-review:";

/**
 * Whether this action goes out by the owner's hand: assisted mode, or (in auto mode) a reply to a review the owner
 * pasted in. Everything else in auto mode goes to the executor exactly as before.
 */
export function isAssisted(action: Pick<OsAction, "actionType" | "proposedPayload">, mode: PublishMode): boolean {
  if (!isGoogleAction(action.actionType)) return false;
  if (mode === "assisted") return true;
  const reviewId = (action.proposedPayload as { reviewId?: unknown } | null)?.reviewId;
  return typeof reviewId === "string" && reviewId.startsWith(LOCAL_REVIEW_PREFIX);
}
