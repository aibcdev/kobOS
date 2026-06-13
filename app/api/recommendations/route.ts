import { NextResponse } from "next/server";
import { z } from "zod";
import { persistAiRecommendations } from "@/lib/ai/recommendations";
import { geminiConfigError, isGeminiConfigured } from "@/lib/ai/gemini-config";
import { requireApiUser } from "@/lib/auth/api-session";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import { prisma } from "@/lib/db/prisma";

const querySchema = z.object({
  restaurantId: z.string().min(12),
  take: z.coerce.number().min(1).max(100).optional(),
});

const generateSchema = z.object({
  restaurantId: z.string().min(12),
});

export async function GET(req: Request) {
  const session = await requireApiUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const sp = new URL(req.url).searchParams;
  const parsed = querySchema.safeParse({
    restaurantId: sp.get("restaurantId"),
    take: sp.get("take") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const allowed = await assertRestaurantMembership(session.userId, parsed.data.restaurantId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const recommendations = await prisma.recommendation.findMany({
    where: { restaurantId: parsed.data.restaurantId },
    orderBy: [{ impactScore: "desc" }, { createdAt: "desc" }],
    take: parsed.data.take ?? 40,
    include: { insight: true },
  });

  return NextResponse.json({ recommendations });
}

/** Manual trigger for OpenAI-backed recommendations (bypasses GROWTH_AUTO_AI_RECOMMENDATIONS). */
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

  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const allowed = await assertRestaurantMembership(session.userId, parsed.data.restaurantId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isGeminiConfigured()) {
    return NextResponse.json({ error: geminiConfigError() }, { status: 503 });
  }

  const created = await persistAiRecommendations(parsed.data.restaurantId);
  return NextResponse.json({ ok: true, ...created }, { status: 201 });
}
