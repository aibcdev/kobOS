import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import { prisma } from "@/lib/db/prisma";
import { ensureDemoDemandRecommendations } from "@/lib/demand-engine/actions";

const querySchema = z.object({
  restaurantId: z.string().min(12),
  status: z.enum(["PENDING", "APPROVED", "DISMISSED", "EXPIRED", "all"]).optional(),
});

export async function GET(req: Request) {
  const session = await requireApiUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const sp = new URL(req.url).searchParams;
  const parsed = querySchema.safeParse({
    restaurantId: sp.get("restaurantId"),
    status: sp.get("status") ?? "PENDING",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const allowed = await assertRestaurantMembership(session.userId, parsed.data.restaurantId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await ensureDemoDemandRecommendations(parsed.data.restaurantId);

  const status = parsed.data.status ?? "PENDING";
  const recommendations = await prisma.demandRecommendation.findMany({
    where: {
      restaurantId: parsed.data.restaurantId,
      ...(status === "all" ? {} : { status }),
    },
    orderBy: [{ impactScore: "desc" }, { createdAt: "desc" }],
    take: 40,
  });

  return NextResponse.json({ recommendations });
}
