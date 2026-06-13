import { ContentType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import { requireApiUser } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";
import { generateAiEraArticle, generateAiEraBrief } from "@/lib/seo/generate-ai-era-content";

const bodySchema = z.object({
  restaurantId: z.string().min(12),
  keyword: z.string().min(2).max(200),
  mode: z.enum(["brief", "article"]).default("brief"),
  edgeHint: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const session = await requireApiUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const allowed = await assertRestaurantMembership(session.userId, parsed.data.restaurantId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: parsed.data.restaurantId },
    select: { name: true, city: true, cuisineType: true },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  const input = {
    keyword: parsed.data.keyword.trim(),
    restaurantName: restaurant.name,
    city: restaurant.city,
    cuisineType: restaurant.cuisineType,
    edgeHint: parsed.data.edgeHint,
  };

  const generated =
    parsed.data.mode === "article"
      ? await generateAiEraArticle(input)
      : await generateAiEraBrief(input);

  if (!generated.ok) {
    return NextResponse.json({ error: generated.error }, { status: 503 });
  }

  const result = generated.result;
  const output: string =
    "articleMarkdown" in result
      ? String(result.articleMarkdown)
      : JSON.stringify(result.brief, null, 2);

  const row = await prisma.generatedContent.create({
    data: {
      restaurantId: parsed.data.restaurantId,
      type: ContentType.SEO_BLOG,
      prompt: `AI-era brief · ${input.keyword}`,
      output,
      status: "READY",
    },
  });

  return NextResponse.json({
    ok: true,
    id: row.id,
    brief: result.brief,
    prePublishChecks: result.prePublishChecks,
    readyToPublish: result.readyToPublish,
    ...("articleMarkdown" in result ? { articleMarkdown: result.articleMarkdown } : {}),
  });
}
