import { ContentType } from "@prisma/client";
import OpenAI from "openai";
import { prisma } from "@/lib/db/prisma";

const typeLabels: Record<ContentType, string> = {
  SEO_BLOG: "SEO blog post",
  LOCATION_PAGE: "local landing page",
  MENU_DESCRIPTIONS: "menu item descriptions",
  EVENT_PAGE: "event landing page",
  EMAIL_CAMPAIGN: "email campaign",
  INSTAGRAM_CAPTION: "Instagram caption set",
  TIKTOK_CONCEPT: "TikTok video concepts",
  GOOGLE_BUSINESS_POST: "Google Business Profile post",
  GROWTH_FOOD_ANALYSIS: "Growth · food photography analysis",
  GROWTH_WEBSITE_PLAN: "Growth · website redesign plan",
  GROWTH_REVIEW_REPLY: "Growth · review relationship draft",
};

export async function generateAndStoreContent(args: {
  restaurantId: string;
  type: ContentType;
  extraPrompt?: string;
}): Promise<{ id: string; output: string } | { error: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { error: "OPENAI_API_KEY is not configured." };
  }

  const restaurant = await prisma.restaurant.findUnique({ where: { id: args.restaurantId } });
  if (!restaurant) {
    return { error: "Restaurant not found." };
  }

  const prompt = [
    `Restaurant: ${restaurant.name}`,
    restaurant.city ? `City: ${restaurant.city}` : null,
    restaurant.cuisineType ? `Cuisine: ${restaurant.cuisineType}` : null,
    `Deliverable: ${typeLabels[args.type]}.`,
    "Tone: premium hospitality, concise, specific, no hashtags unless channel needs them.",
    args.extraPrompt?.trim() ? `Brief: ${args.extraPrompt.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    messages: [
      { role: "system", content: "You write high-converting restaurant marketing copy." },
      { role: "user", content: prompt },
    ],
  });

  const output = completion.choices[0]?.message?.content?.trim() ?? "";
  if (!output) {
    const row = await prisma.generatedContent.create({
      data: {
        restaurantId: args.restaurantId,
        type: args.type,
        prompt,
        output: "",
        status: "FAILED",
      },
    });
    return { id: row.id, output: "" };
  }

  const row = await prisma.generatedContent.create({
    data: {
      restaurantId: args.restaurantId,
      type: args.type,
      prompt,
      output,
      status: "READY",
    },
  });

  return { id: row.id, output };
}
