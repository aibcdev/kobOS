import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import { ensureTodayBrief, getTodayBrief } from "@/lib/chief-of-staff/ensure-today-brief";

const querySchema = z.object({
  restaurantId: z.string().min(12),
  refresh: z.enum(["0", "1"]).optional(),
});

export async function GET(req: Request) {
  const session = await requireApiUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    restaurantId: url.searchParams.get("restaurantId"),
    refresh: url.searchParams.get("refresh") ?? "0",
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "restaurantId required" }, { status: 400 });
  }

  const allowed = await assertRestaurantMembership(session.userId, parsed.data.restaurantId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const payload =
      parsed.data.refresh === "1"
        ? await ensureTodayBrief(parsed.data.restaurantId, true)
        : await getTodayBrief(parsed.data.restaurantId);
    return NextResponse.json(payload);
  } catch (e) {
    console.error("[chief-of-staff/today]", e);
    return NextResponse.json({ error: "Could not load brief" }, { status: 500 });
  }
}
