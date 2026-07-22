import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-session";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: Request) {
  const session = await requireApiUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const url = new URL(req.url);
  const restaurantId = url.searchParams.get("restaurantId")?.trim();
  const packId = url.searchParams.get("packId")?.trim();
  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId required" }, { status: 422 });
  }

  const allowed = await assertRestaurantMembership(session.userId, restaurantId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (packId) {
    const pack = await prisma.creativePack.findFirst({
      where: { id: packId, restaurantId },
      include: {
        contents: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            type: true,
            output: true,
            imageUrl: true,
            prompt: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
    if (!pack) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ pack });
  }

  const packs = await prisma.creativePack.findMany({
    where: { restaurantId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      status: true,
      targetCount: true,
      doneCount: true,
      brief: true,
      errorMessage: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ packs });
}
