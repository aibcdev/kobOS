import { ContentType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateAndStoreContent } from "@/lib/ai/content";
import { requireApiUser } from "@/lib/auth/api-session";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";

const bodySchema = z.object({
  restaurantId: z.string().min(12),
  type: z.nativeEnum(ContentType),
  prompt: z.string().max(4000).optional(),
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

  const result = await generateAndStoreContent({
    restaurantId: parsed.data.restaurantId,
    type: parsed.data.type,
    extraPrompt: parsed.data.prompt,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.error.includes("OPENAI") ? 503 : 400 });
  }

  return NextResponse.json({ ok: true, id: result.id, outputPreview: result.output.slice(0, 500) }, { status: 201 });
}
