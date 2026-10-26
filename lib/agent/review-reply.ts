import type { CustomerReview } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { proposeAction } from "@/lib/agent/propose";
import { LOCAL_REVIEW_PREFIX, publishMode } from "@/lib/agent/publish-mode";
import type { PolicyDeps } from "@/lib/agent/policy";
import { draftReviewReplyOrTemplate, type Generate } from "@/lib/connectors/gbp/drafter";
import { reviewSubject, reviewTaskKey } from "@/lib/connectors/gbp/review-subject";
import { googleConnection } from "@/lib/kob/talk/restaurant-facts";

export type ReplyDraft = {
  reviewId: string;
  contentId: string;
  rating: number;
  reviewer: string | null;
  text: string;
  /** "approval": waiting in Needs you; "chat_only": shown here because Google isn't connected or the review isn't from Google. */
  placed: "approval" | "chat_only";
  actionId: string | null;
  /** The owner posts it on Google themselves after approving (assisted mode). */
  assisted: boolean;
  reason: string | null;
};

/** The content queue copy of a reply draft, so the owner can always see (and copy) what KOB wrote. */
export const replyContentPrompt = (reviewId: string) => `review:${reviewId}`;

export async function saveReplyDraft(restaurantId: string, reviewId: string, text: string): Promise<string> {
  const row = await prisma.generatedContent.create({
    data: { restaurantId, type: "GROWTH_REVIEW_REPLY", prompt: replyContentPrompt(reviewId), output: text, status: "READY" },
  });
  return row.id;
}

/** After Google shows the reply: mark the matching draft published. */
export async function markReplyDraftPublished(restaurantId: string, reviewId: string, text: string): Promise<void> {
  await prisma.generatedContent.updateMany({
    where: { restaurantId, type: "GROWTH_REVIEW_REPLY", prompt: replyContentPrompt(reviewId), output: text },
    data: { published: true },
  });
}

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
  const contentId = await saveReplyDraft(restaurantId, review.id, text);
  const base = { reviewId: review.id, contentId, rating: review.rating, reviewer: review.reviewerName?.trim().split(/\s+/)[0] ?? null, text };
  if (review.source !== "GOOGLE")
    return { ...base, placed: "chat_only", actionId: null, assisted: false, reason: "This review isn't from Google, so there's nowhere on Google to post the reply." };
  // Assisted mode: the owner approves, copies and posts it; no Google connection is needed, and a review the owner
  // pasted in (no Google id yet) gets a local one.
  const assisted = (await publishMode(restaurantId)) === "assisted";
  if (!assisted) {
    const google = await googleConnection(restaurantId);
    if (!review.externalReviewId || google.state !== "connected")
      return { ...base, placed: "chat_only", actionId: null, assisted, reason: "Connect your Google listing so KOB can post replies after you approve them." };
  }

  const name = review.externalReviewId ?? `${LOCAL_REVIEW_PREFIX}${review.id}`;
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
    return { ...base, placed: "chat_only", actionId: null, assisted, reason: action.failureReason ?? "It couldn't be added to your approvals." };
  return { ...base, placed: "approval", actionId: action.id, assisted, reason: null };
}
