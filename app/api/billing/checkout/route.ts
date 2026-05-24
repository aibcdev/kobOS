import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { getRestaurantForMember } from "@/lib/billing/restaurant-member";
import { createSubscriptionCheckoutSession } from "@/lib/billing/checkout-subscription-session";
import { getStripePricePro, getStripePriceStarter, requireStripe } from "@/lib/billing/stripe-server";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

const bodySchema = z.object({
  restaurantId: z.string().min(12),
  tier: z.enum(["starter", "pro"]),
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

  let stripe: ReturnType<typeof requireStripe>;
  try {
    stripe = requireStripe();
  } catch {
    return NextResponse.json({ error: "Stripe is not configured (STRIPE_SECRET_KEY)." }, { status: 503 });
  }

  const priceId = parsed.data.tier === "pro" ? getStripePricePro() : getStripePriceStarter();
  if (!priceId) {
    return NextResponse.json(
      { error: parsed.data.tier === "pro" ? "STRIPE_PRICE_PRO is not set" : "STRIPE_PRICE_STARTER is not set" },
      { status: 503 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  const email = user?.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "Account email missing" }, { status: 400 });
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    new URL(req.url).origin ||
    "http://localhost:3333";

  const successPath = `/dashboard/billing?r=${encodeURIComponent(restaurant.id)}&checkout=success`;
  const cancelPath = `/dashboard/billing?r=${encodeURIComponent(restaurant.id)}&checkout=cancel`;

  try {
    const sessionStripe = await createSubscriptionCheckoutSession({
      stripe,
      restaurantId: restaurant.id,
      customerEmail: email,
      existingStripeCustomerId: restaurant.stripeCustomerId,
      priceId,
      origin,
      successPath,
      cancelPath,
    });

    if (!sessionStripe.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL" }, { status: 502 });
    }

    return NextResponse.json({ url: sessionStripe.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe checkout failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
