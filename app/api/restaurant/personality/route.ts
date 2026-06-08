import { NextResponse } from "next/server";
import { z } from "zod";
import type { AiPersonality } from "@prisma/client";
import { requireApiUser } from "@/lib/auth/api-session";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import { prisma } from "@/lib/db/prisma";

const bodySchema = z.object({
  restaurantId: z.string().min(12),
  aiPersonality: z.enum(["BALANCED", "WARM", "DIRECT", "CONCISE", "SASSY"]),
});

export async function PATCH(req: Request) {
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
    return NextResponse.json({ error: "Invalid body" }, { status: 422 });
  }

  const allowed = await assertRestaurantMembership(session.userId, parsed.data.restaurantId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.restaurant.update({
    where: { id: parsed.data.restaurantId },
    data: { aiPersonality: parsed.data.aiPersonality as AiPersonality },
    select: { aiPersonality: true },
  });

  return NextResponse.json({ ok: true, aiPersonality: updated.aiPersonality });
}
