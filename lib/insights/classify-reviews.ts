import type { ReviewSentiment, ReviewTheme } from "@prisma/client";
import { openaiJsonCompletion } from "@/lib/growth-agent/openai-json-completion";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const tagSchema = z.object({
  tags: z.array(
    z.object({
      theme: z.enum(["FOOD", "SERVICE", "PRICE", "SPEED", "ATMOSPHERE", "CLEANLINESS"]),
      sentiment: z.enum(["POSITIVE", "NEGATIVE", "NEUTRAL"]),
    }),
  ),
});

export async function classifyReviewsForRestaurant(restaurantId: string): Promise<{ classified: number }> {
  const reviews = await prisma.customerReview.findMany({
    where: {
      restaurantId,
      body: { not: "" },
      themeTags: { none: {} },
    },
    take: 40,
    select: { id: true, body: true, rating: true },
  });

  let classified = 0;
  for (const review of reviews) {
    const result = await openaiJsonCompletion({
      system: `Classify restaurant review text into themes and sentiment. Return JSON: { "tags": [{ "theme": "FOOD|SERVICE|PRICE|SPEED|ATMOSPHERE|CLEANLINESS", "sentiment": "POSITIVE|NEGATIVE|NEUTRAL" }] }. Only include themes mentioned. Max 3 tags.`,
      user: `Rating: ${review.rating}/5\nReview: ${review.body.slice(0, 800)}`,
      temperature: 0.2,
    });

    let tags: { theme: ReviewTheme; sentiment: ReviewSentiment }[] = [];
    if (result.ok) {
      try {
        const parsed = tagSchema.parse(JSON.parse(result.raw));
        tags = parsed.tags;
      } catch {
        tags = fallbackTags(review.rating, review.body);
      }
    } else {
      tags = fallbackTags(review.rating, review.body);
    }

    if (tags.length) {
      await prisma.reviewThemeTag.createMany({
        data: tags.map((t) => ({ reviewId: review.id, theme: t.theme, sentiment: t.sentiment })),
        skipDuplicates: true,
      });
      classified++;
    }
  }

  return { classified };
}

function fallbackTags(rating: number, body: string): { theme: ReviewTheme; sentiment: ReviewSentiment }[] {
  const sentiment: ReviewSentiment = rating >= 4 ? "POSITIVE" : rating <= 2 ? "NEGATIVE" : "NEUTRAL";
  const lower = body.toLowerCase();
  const themes: ReviewTheme[] = [];
  if (/food|taste|delicious|menu|dish/.test(lower)) themes.push("FOOD");
  if (/service|staff|waiter|friendly|rude/.test(lower)) themes.push("SERVICE");
  if (/price|expensive|cheap|value|cost/.test(lower)) themes.push("PRICE");
  if (/slow|fast|wait|quick/.test(lower)) themes.push("SPEED");
  if (!themes.length) themes.push(rating >= 4 ? "FOOD" : "SERVICE");
  return themes.slice(0, 2).map((theme) => ({ theme, sentiment }));
}
