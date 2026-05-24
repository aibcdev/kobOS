import { InsightStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import { prisma } from "@/lib/db/prisma";

const querySchema = z.object({
  restaurantId: z.string().min(12),
  status: z.nativeEnum(InsightStatus).optional(),
  take: z.coerce.number().min(1).max(100).optional(),
});

export async function GET(req: Request) {
  const session = await requireApiUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const sp = new URL(req.url).searchParams;
  const parsed = querySchema.safeParse({
    restaurantId: sp.get("restaurantId"),
    status: sp.get("status") ?? undefined,
    take: sp.get("take") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const allowed = await assertRestaurantMembership(session.userId, parsed.data.restaurantId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const insights = await prisma.growthInsight.findMany({
    where: {
      restaurantId: parsed.data.restaurantId,
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: parsed.data.take ?? 40,
  });

  return NextResponse.json({ insights });
}
