import type { CustomerReview } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { proposeAction } from "@/lib/agent/propose";
import type { PolicyDeps } from "@/lib/agent/policy";
import { draftReviewReplyOrTemplate, type Generate } from "@/lib/connectors/gbp/drafter";
import { reviewSubject, reviewTaskKey } from "@/lib/connectors/gbp/producer";
import { googleConnection } from "./restaurant-facts";

export type ReplyDraft = {
  reviewId: string;
  rating: number;
  reviewer: string | null;
  text: string;
  /** "approval": waiting in Needs you; "chat_only": shown here because Google isn't connected or the review isn't from Google. */
  placed: "approval" | "chat_only";
  actionId: string | null;
  reason: string | null;
};

/**
 * Draft a reply to one review and, when Google is connected and the review came from Google, put it in the owner's
 * approvals. Never posts: posting only happens after the owner approves it.
 */
export async function draftReplyForReview(
  restaurantId: string,
  review: CustomerReview,
  requestedByUserId: string | null,
  opts: { generate?: Generate; policy?: PolicyDeps; now?: Date } = {},
): Promise<ReplyDraft> {
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { id: restaurantId }, select: { name: true, vibe: true } });
  const { text } = await draftReviewReplyOrTemplate(
    { restaurantName: restaurant.name, voice: restaurant.vibe, reviewerName: review.reviewerName, rating: review.rating, reviewText: review.body },
    opts.generate,
  );
  const base = { reviewId: review.id, rating: review.rating, reviewer: review.reviewerName?.trim().split(/\s+/)[0] ?? null, text };
  const google = await googleConnection(restaurantId);
  if (review.source !== "GOOGLE" || !review.externalReviewId)
    return { ...base, placed: "chat_only", actionId: null, reason: "This review isn't from Google, so it can't be posted from KOB." };
  if (google.state !== "connected")
    return { ...base, placed: "chat_only", actionId: null, reason: "Connect your Google listing so KOB can post replies after you approve them." };

  const name = review.externalReviewId;
  const { action } = await proposeAction(
    {
      restaurantId,
      title: `Reply to ${base.reviewer ?? "a guest"}'s ${review.rating}-star Google review`,
      summary: text,
      payload: { actionType: "gbp.review.reply", reviewId: name, replyText: text },
      taskKey: reviewTaskKey(name),
      channelOrigin: "WEB",
      requestedByUserId,
      evidence: [{ type: "review", source: "GBP", sourceId: name, note: review.body.slice(0, 280) }],
      subject: reviewSubject(review),
      window: name,
      now: opts.now,
    },
    opts.policy,
  );
  if (action.status === "FAILED")
    return { ...base, placed: "chat_only", actionId: null, reason: action.failureReason ?? "It couldn't be added to your approvals." };
  return { ...base, placed: "approval", actionId: action.id, reason: null };
}
