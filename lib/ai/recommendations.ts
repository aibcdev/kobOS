import { RecommendationType } from "@prisma/client";
import OpenAI from "openai";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

const outputSchema = z.object({
  recommendations: z.array(
    z.object({
      type: z.string(),
      title: z.string(),
      action: z.string(),
      aiSummary: z.string(),
      impactScore: z.number().min(0).max(100),
      insightId: z.string().nullable().optional(),
    }),
  ),
});

function mapRecommendationType(raw: string): RecommendationType | null {
  const upper = raw.toUpperCase().replace(/[\s-]+/g, "_");
  const values = Object.values(RecommendationType) as string[];
  return values.includes(upper) ? (upper as RecommendationType) : null;
}

export async function persistAiRecommendations(restaurantId: string): Promise<{ created: number }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { created: 0 };
  }

  const [restaurant, insights] = await Promise.all([
    prisma.restaurant.findUnique({ where: { id: restaurantId } }),
    prisma.growthInsight.findMany({
      where: { restaurantId, status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  if (!restaurant) {
    return { created: 0 };
  }

  const openai = new OpenAI({ apiKey });

  const insightBlob = insights.map((i) => ({
    id: i.id,
    type: i.type,
    title: i.title,
    description: i.description,
    priority: i.priority,
  }));

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are KOB Growth Agent. Output JSON with key "recommendations" (array).
Each item: type (one of: ${Object.keys(RecommendationType).join(", ")}), title, action (short imperative), aiSummary (1-2 sentences), impactScore (0-100), insightId (optional, id from input or null).
Focus on the next best actions for a restaurant, not generic advice.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          restaurant: {
            name: restaurant.name,
            city: restaurant.city,
            state: restaurant.state,
            cuisineType: restaurant.cuisineType,
          },
          openInsights: insightBlob,
        }),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    return { created: 0 };
  }

  let parsed: z.infer<typeof outputSchema>;
  try {
    parsed = outputSchema.parse(JSON.parse(raw));
  } catch {
    return { created: 0 };
  }

  let created = 0;
  for (const rec of parsed.recommendations) {
    const type = mapRecommendationType(rec.type);
    if (!type) {
      continue;
    }
    const insightId =
      rec.insightId && insights.some((i) => i.id === rec.insightId) ? rec.insightId : undefined;

    await prisma.recommendation.create({
      data: {
        restaurantId,
        insightId: insightId ?? null,
        type,
        title: rec.title.slice(0, 200),
        action: rec.action.slice(0, 2000),
        aiSummary: rec.aiSummary.slice(0, 2000),
        impactScore: Math.round(rec.impactScore),
      },
    });
    created += 1;
  }

  return { created };
}
