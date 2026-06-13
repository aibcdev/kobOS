import { NextResponse } from "next/server";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import { requireApiUser } from "@/lib/auth/api-session";
import { getCustomerVoiceInsights } from "@/lib/insights/customer-voice";

export async function GET(req: Request) {
  const session = await requireApiUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const restaurantId = new URL(req.url).searchParams.get("restaurantId");
  if (!restaurantId) return NextResponse.json({ error: "restaurantId required" }, { status: 400 });

  const allowed = await assertRestaurantMembership(session.userId, restaurantId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const insights = await getCustomerVoiceInsights(restaurantId);
  return NextResponse.json(insights);
}
