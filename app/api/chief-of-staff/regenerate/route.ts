import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import { prisma } from "@/lib/db/prisma";

const bodySchema = z.object({
  restaurantId: z.string().min(12),
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
    return NextResponse.json({ error: "restaurantId required" }, { status: 400 });
  }

  const allowed = await assertRestaurantMembership(session.userId, parsed.data.restaurantId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { ensureTodayBrief } = await import("@/lib/chief-of-staff/ensure-today-brief");
  try {
    const payload = await ensureTodayBrief(parsed.data.restaurantId, true);
    return NextResponse.json(payload);
  } catch (e) {
    console.error("[chief-of-staff/regenerate]", e);
    return NextResponse.json({ error: "Regenerate failed" }, { status: 500 });
  }
}
