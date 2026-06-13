import { NextResponse } from "next/server";
import { z } from "zod";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import { requireApiUser } from "@/lib/auth/api-session";
import { ensureSampleSalesData } from "@/lib/dashboard/sample-data";
import { prisma } from "@/lib/db/prisma";

const bodySchema = z.object({
  restaurantId: z.string().min(12),
  enabled: z.boolean(),
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
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const allowed = await assertRestaurantMembership(session.userId, parsed.data.restaurantId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.restaurant.update({
    where: { id: parsed.data.restaurantId },
    data: { useSampleData: parsed.data.enabled },
  });

  if (parsed.data.enabled) {
    await ensureSampleSalesData(parsed.data.restaurantId);
  }

  return NextResponse.json({ ok: true, useSampleData: parsed.data.enabled });
}
