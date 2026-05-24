import { NextResponse } from "next/server";
import { z } from "zod";
import { buildDigestSnapshot } from "@/lib/digest/build-snapshot";
import { requireApiUser } from "@/lib/auth/api-session";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";

const querySchema = z.object({
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
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const allowed = await assertRestaurantMembership(session.userId, parsed.data.restaurantId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const digest = await buildDigestSnapshot(parsed.data.restaurantId);
  return NextResponse.json({ digest });
}
