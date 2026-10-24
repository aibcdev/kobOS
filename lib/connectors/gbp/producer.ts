import type { CustomerReview } from "@prisma/client";
import { draftReviewReplyOrTemplate, type Generate } from "@/lib/connectors/gbp/drafter";
import { prisma } from "@/lib/db/prisma";
import { flag } from "@/lib/flags";
import { proposeAction } from "@/lib/agent/propose";
import { saveReplyDraft } from "@/lib/agent/review-reply";
import type { PolicyDeps } from "@/lib/agent/policy";
import { reviewSubject, reviewTaskKey } from "@/lib/connectors/gbp/review-subject";

/** Older reviews aren't drafted: the first sync would otherwise ask the owner about a month of backlog. */
export const DRAFT_WINDOW_DAYS = 7;

export { reviewSubject, reviewTaskKey };

/**
 * For each unanswered recent review: draft a reply and propose it through the ledger. Policy decides whether it
 * waits for the owner or goes out under an existing grant. One proposal per review, ever: a skipped draft isn't
 * re-proposed on the next sync.
 */
export async function proposeReviewReplies(
  restaurantId: string,
  reviews: CustomerReview[],
  opts: { now?: Date; generate?: Generate; policy?: PolicyDeps } = {},
): Promise<{ proposed: number; skipped: number }> {
  if (!reviews.length || !(await flag("GBP_LIVE", restaurantId))) return { proposed: 0, skipped: reviews.length };
  const now = opts.now ?? new Date();
  const cutoff = now.getTime() - DRAFT_WINDOW_DAYS * 86_400_000;
  const recent = reviews.filter((r) => r.externalReviewId && r.reviewedAt && r.reviewedAt.getTime() >= cutoff);
  if (!recent.length) return { proposed: 0, skipped: reviews.length };

  const keys = recent.map((r) => reviewTaskKey(r.externalReviewId!));
  const already = new Set(
    (await prisma.osAction.findMany({ where: { restaurantId, taskKey: { in: keys } }, select: { taskKey: true } })).map((a) => a.taskKey),
  );
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { id: restaurantId }, select: { name: true, vibe: true } });

  let proposed = 0;
  for (const r of recent) {
    const name = r.externalReviewId!;
    if (already.has(reviewTaskKey(name))) continue;
    // Without a model the safe template is used, so every new review still gets a draft for the owner to check.
    const { text: reply } = await draftReviewReplyOrTemplate(
      { restaurantName: restaurant.name, voice: restaurant.vibe, reviewerName: r.reviewerName, rating: r.rating, reviewText: r.body },
      opts.generate,
    );
    await saveReplyDraft(restaurantId, r.id, reply);
    const who = r.reviewerName?.trim().split(/\s+/)[0] || "a guest";
    await proposeAction(
      {
        restaurantId,
        title: `Reply to ${who}'s ${r.rating}-star Google review`,
        summary: reply,
        payload: { actionType: "gbp.review.reply", reviewId: name, replyText: reply },
        taskKey: reviewTaskKey(name),
        channelOrigin: "EVENT",
        evidence: [{ type: "review", source: "GBP", sourceId: name, note: r.body.slice(0, 280) }],
        subject: reviewSubject(r),
        window: name,
        now,
      },
      opts.policy,
    );
    proposed++;
  }
  return { proposed, skipped: reviews.length - proposed };
}
