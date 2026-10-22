import { NextResponse } from "next/server";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import { requireApiUser } from "@/lib/auth/api-session";
import { priceForCountry } from "@/lib/billing/regional-pricing";
import { trialState } from "@/lib/billing/trial";
import { prisma } from "@/lib/db/prisma";

/** Trial and price for the Today banner ("4 days left in your free trial"). */
export async function GET(req: Request) {
  const session = await requireApiUser();
  if (!session.ok) return NextResponse.json({ error: session.message }, { status: session.status });
  const restaurantId = new URL(req.url).searchParams.get("restaurantId") ?? "";
  if (!restaurantId || !(await assertRestaurantMembership(session.userId, restaurantId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const r = await prisma.restaurant.findUniqueOrThrow({
    where: { id: restaurantId },
    select: { billingStatus: true, trialEndsAt: true, subscriptionPlan: true, countryCode: true },
  });
  const s = trialState(r);
  return NextResponse.json(
    {
      state: s.kind,
      daysLeft: s.kind === "trialing" ? s.daysLeft : null,
      endsAt: s.kind === "trialing" ? s.endsAt.toISOString() : s.kind === "ended" ? s.endedAt.toISOString() : null,
      price: priceForCountry(r.countryCode).label,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
