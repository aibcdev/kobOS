import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { getRestaurantForMember } from "@/lib/billing/restaurant-member";
import { requireStripe } from "@/lib/billing/stripe-server";

export const runtime = "nodejs";

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
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const restaurant = await getRestaurantForMember(session.userId, parsed.data.restaurantId);
  if (!restaurant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!restaurant.stripeCustomerId) {
    return NextResponse.json({ error: "No Stripe customer on file — subscribe first." }, { status: 400 });
  }

  let stripe: ReturnType<typeof requireStripe>;
  try {
    stripe = requireStripe();
  } catch {
    return NextResponse.json({ error: "Stripe is not configured (STRIPE_SECRET_KEY)." }, { status: 503 });
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    new URL(req.url).origin ||
    "http://localhost:3333";

  const returnUrl = `${origin}/dashboard/billing?r=${encodeURIComponent(restaurant.id)}`;

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: restaurant.stripeCustomerId,
      return_url: returnUrl,
    });
    return NextResponse.json({ url: portal.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe portal failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
