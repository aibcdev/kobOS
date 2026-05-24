import { prisma } from "@/lib/db/prisma";
import {
  REVIEW_RELATIONSHIP_SYSTEM,
  buildReviewRelationshipUserMessage,
} from "@/lib/prompts/growth-agent/review-relationship-agent";
import { GROWTH_AGENT_SYSTEM_MASTER } from "@/lib/prompts/growth-agent/system-master";
import { reviewRelationshipJsonSchema, type ReviewRelationshipJson } from "@/lib/growth-agent/review-relationship-schema";
import { openaiJsonCompletion, parseJsonWithSchema } from "@/lib/growth-agent/openai-json-completion";

export type ReviewRelationshipResult = { ok: true; data: ReviewRelationshipJson } | { ok: false; error: string };

export async function generateReviewRelationship(
  restaurantId: string,
  reviewId: string,
): Promise<ReviewRelationshipResult> {
  const [restaurant, review] = await Promise.all([
    prisma.restaurant.findUnique({ where: { id: restaurantId } }),
    prisma.customerReview.findFirst({
      where: { id: reviewId, restaurantId },
    }),
  ]);

  if (!restaurant) {
    return { ok: false, error: "Restaurant not found" };
  }
  if (!review) {
    return { ok: false, error: "Review not found" };
  }

  let pastInteractionsSummary = "No prior logged interactions in KOB for this reviewer.";
  if (review.reviewerName?.trim()) {
    const profile = await prisma.reviewerProfile.findFirst({
      where: {
        restaurantId,
        name: { equals: review.reviewerName.trim(), mode: "insensitive" },
      },
    });
    if (profile) {
      const bits = [
        profile.notes?.trim() ? `Notes: ${profile.notes.trim()}` : null,
        `Visits (logged): ${profile.totalVisits}`,
        `Influence score: ${profile.influenceScore}/10`,
        profile.lastContactAt ? `Last contact: ${profile.lastContactAt.toISOString().slice(0, 10)}` : null,
      ].filter(Boolean);
      pastInteractionsSummary = bits.join(" · ");
    }
  }

  const user = buildReviewRelationshipUserMessage({
    fullReview: review.body || "(no text)",
    stars: review.rating,
    name: review.reviewerName || "Guest",
    pastInteractionsSummary,
    tone: restaurant.vibe ?? "Warm, confident hospitality; concise and human.",
  });

  const completion = await openaiJsonCompletion({
    system: `${GROWTH_AGENT_SYSTEM_MASTER}\n\n${REVIEW_RELATIONSHIP_SYSTEM}`,
    user,
    temperature: 0.55,
  });
  if (!completion.ok) {
    return completion;
  }

  const parsed = parseJsonWithSchema(completion.raw, reviewRelationshipJsonSchema);
  if (!parsed.ok) {
    return parsed;
  }

  const reply = parsed.data.best_reply.slice(0, 280);
  return { ok: true, data: { ...parsed.data, best_reply: reply } };
}
