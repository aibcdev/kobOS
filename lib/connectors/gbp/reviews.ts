import type { CustomerReview } from "@prisma/client";
import { starsOf, type GbpReview } from "@/lib/connectors/gbp/client";
import { markReplyDraftPublished } from "@/lib/agent/review-reply";
import { prisma } from "@/lib/db/prisma";

/**
 * Writes Google reviews into CustomerReview (source GOOGLE, externalReviewId = the review's resource name). Returns
 * the rows this restaurant still needs to answer. A review already stored under another restaurant is left alone.
 */
export async function upsertGbpReviews(restaurantId: string, reviews: GbpReview[]): Promise<CustomerReview[]> {
  if (!reviews.length) return [];
  const existing = await prisma.customerReview.findMany({
    where: { source: "GOOGLE", externalReviewId: { in: reviews.map((r) => r.name) } },
    select: { externalReviewId: true, restaurantId: true },
  });
  const owner = new Map(existing.map((e) => [e.externalReviewId, e.restaurantId]));

  const unanswered: CustomerReview[] = [];
  for (const r of reviews) {
    const other = owner.get(r.name);
    if (other && other !== restaurantId) continue;
    const data = {
      reviewerName: r.reviewer?.isAnonymous ? null : (r.reviewer?.displayName ?? null),
      rating: starsOf(r.starRating),
      body: r.comment ?? "",
      reviewedAt: new Date(r.createTime),
      replied: Boolean(r.reviewReply?.comment),
    };
    const row = await prisma.customerReview.upsert({
      where: { source_externalReviewId: { source: "GOOGLE", externalReviewId: r.name } },
      create: { restaurantId, source: "GOOGLE", externalReviewId: r.name, ...data },
      update: data,
    });
    if (!row.replied && row.rating > 0) unanswered.push(row);
  }
  return unanswered;
}

/** Marks a review answered once its reply has been read back from Google. */
export async function recordPostedReply(restaurantId: string, reviewName: string, replyText: string, at: Date): Promise<void> {
  const review = await prisma.customerReview.findFirst({ where: { restaurantId, source: "GOOGLE", externalReviewId: reviewName }, select: { id: true } });
  if (!review) return;
  if (await prisma.reviewReply.findFirst({ where: { reviewId: review.id, status: "POSTED", replyText }, select: { id: true } })) return;
  await prisma.$transaction([
    prisma.customerReview.update({ where: { id: review.id }, data: { replied: true } }),
    prisma.reviewReply.create({ data: { reviewId: review.id, replyText, status: "POSTED", postedAt: at } }),
  ]);
  await markReplyDraftPublished(restaurantId, review.id, replyText);
}
