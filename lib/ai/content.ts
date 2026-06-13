import { ContentType } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { geminiConfigError, getGeminiModelName, isGeminiConfigured } from "@/lib/ai/gemini-config";
import { generateImage } from "@/lib/ai/generate-image";
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

/** Content types that benefit from an accompanying generated image */
const IMAGE_TYPES: ContentType[] = [
  ContentType.INSTAGRAM_CAPTION,
  ContentType.GOOGLE_BUSINESS_POST,
  ContentType.EVENT_PAGE,
];

async function generateTextWithGemini(prompt: string): Promise<string | null> {
  if (!isGeminiConfigured()) return null;
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!.trim());
    const model = genAI.getGenerativeModel({
      model: getGeminiModelName(),
      generationConfig: { temperature: 0.7 },
    });
    const res = await model.generateContent(prompt);
    const text = res.response.text()?.trim();
    return text || null;
  } catch {
    return null;
  }
}

export async function generateAndStoreContent(args: {
  restaurantId: string;
  type: ContentType;
  extraPrompt?: string;
  withImage?: boolean;
}): Promise<{ id: string; output: string; imageUrl?: string } | { error: string }> {
  if (!isGeminiConfigured()) {
    return { error: `${geminiConfigError()} Add it in Netlify environment variables.` };
  }

  const restaurant = await prisma.restaurant.findUnique({ where: { id: args.restaurantId } });
  if (!restaurant) return { error: "Restaurant not found." };

  const systemLine = "You write high-converting restaurant marketing copy. Be specific, warm, and concise.";

  const prompt = [
    systemLine,
    `Restaurant: ${restaurant.name}`,
    restaurant.city ? `City: ${restaurant.city}` : null,
    restaurant.cuisineType ? `Cuisine: ${restaurant.cuisineType}` : null,
    `Deliverable: ${typeLabels[args.type]}.`,
    "Tone: premium hospitality, concise, specific, no hashtags unless channel needs them.",
    args.extraPrompt?.trim() ? `Brief: ${args.extraPrompt.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const output = await generateTextWithGemini(prompt);

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

  let imageUrl: string | undefined;
  const shouldGenerateImage = args.withImage !== false && IMAGE_TYPES.includes(args.type);
  if (shouldGenerateImage) {
    const imagePrompt = `${restaurant.name} restaurant — ${args.extraPrompt?.trim() || typeLabels[args.type]}`;
    const imgResult = await generateImage(imagePrompt);
    if (imgResult.ok) imageUrl = imgResult.url;
  }

  const row = await prisma.generatedContent.create({
    data: {
      restaurantId: args.restaurantId,
      type: args.type,
      prompt,
      output,
      imageUrl: imageUrl ?? null,
      status: "READY",
    },
  });

  return { id: row.id, output, imageUrl };
}
