import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import { prisma } from "@/lib/db/prisma";

const querySchema = z.object({
  restaurantId: z.string().min(12),
  status: z.enum(["LIVE", "PAUSED", "COMPLETED", "CANCELLED", "DRAFT", "all"]).optional(),
});

export async function GET(req: Request) {
  const session = await requireApiUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const sp = new URL(req.url).searchParams;
  const parsed = querySchema.safeParse({
    restaurantId: sp.get("restaurantId"),
    status: sp.get("status") ?? "LIVE",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const allowed = await assertRestaurantMembership(session.userId, parsed.data.restaurantId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = parsed.data.status ?? "LIVE";
  const offers = await prisma.liveOffer.findMany({
    where: {
      restaurantId: parsed.data.restaurantId,
      ...(status === "all" ? {} : { status }),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { channelPublishes: true },
  });

  return NextResponse.json({ offers });
}
