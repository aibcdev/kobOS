import { NextResponse } from "next/server";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import { requireApiUser } from "@/lib/auth/api-session";
import { growthAgent } from "@/lib/growth-agent";

export const runtime = "nodejs";

/** GET briefing by `?restaurantId=` — authenticated alias forGrowth Agent / dashboard tooling. */
export async function GET(req: Request) {
  const session = await requireApiUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const restaurantId = new URL(req.url).searchParams.get("restaurantId");
  if (!restaurantId?.trim()) {
    return NextResponse.json({ error: "Missing restaurantId" }, { status: 400 });
  }

  const allowed = await assertRestaurantMembership(session.userId, restaurantId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await growthAgent.generateDailyBriefing(restaurantId);
  if (!result.ok) {
    const e = result.error;
    const status =
      e.includes("OPENAI") || e.includes("not configured") || e.includes("API key") || e.includes("Empty model")
        ? 503
        : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, briefing: result.briefing });
}
