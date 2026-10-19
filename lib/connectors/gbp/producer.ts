import type { CustomerReview } from "@prisma/client";
import { draftReviewReply, type Generate } from "@/lib/connectors/gbp/drafter";
import { prisma } from "@/lib/db/prisma";
import { flag } from "@/lib/flags";
import { proposeAction } from "@/lib/agent/propose";
import type { PolicyDeps } from "@/lib/agent/policy";

/** Older reviews aren't drafted: the first sync would otherwise ask the owner about a month of backlog. */
export const DRAFT_WINDOW_DAYS = 7;

const SAFETY = /\b(food poisoning|poison(ed|ing)?|allerg(y|ic|ies)|anaphyla\w*|sick|vomit\w*|ill(ness)?|hospital|diarrh\w*|hair in|glass in|raw chicken|undercooked|cockroach\w*|rat|mice|mouse)\b/i;

/** What the policy engine reads: low stars raise severity; health and hygiene complaints always ask. */
export function reviewSubject(r: Pick<CustomerReview, "rating" | "body">): { rating: number; severity: number; safety: boolean } {
  return { rating: r.rating, severity: r.rating <= 2 ? 2 : r.rating === 3 ? 1 : 0, safety: SAFETY.test(r.body) };
}

export const reviewTaskKey = (reviewName: string) => `gbp-review:${reviewName}`;

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
    const reply = await draftReviewReply(
      { restaurantName: restaurant.name, voice: restaurant.vibe, reviewerName: r.reviewerName, rating: r.rating, reviewText: r.body },
      opts.generate,
    );
    if (!reply) continue;
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
