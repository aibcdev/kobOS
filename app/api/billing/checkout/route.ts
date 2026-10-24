import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { getRestaurantForMember } from "@/lib/billing/restaurant-member";
import { createSubscriptionCheckoutSession } from "@/lib/billing/checkout-subscription-session";
import { priceForCountry } from "@/lib/billing/regional-pricing";
import { getStripePricePro, requireStripe } from "@/lib/billing/stripe-server";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

const bodySchema = z.object({ restaurantId: z.string().min(12) });

/** KOB's Stripe product: STRIPE_PRODUCT_ID, or the product behind the founding price. */
async function kobProduct(stripe: ReturnType<typeof requireStripe>): Promise<string | null> {
  const id = process.env.STRIPE_PRODUCT_ID?.trim();
  if (id) return id;
  const priceId = getStripePricePro();
  if (!priceId) return null;
  const price = await stripe.prices.retrieve(priceId);
  return typeof price.product === "string" ? price.product : price.product.id;
}

/** Add a card: Stripe Checkout at the restaurant's own price and currency. During the trial, billing starts at its end. */
export async function POST(req: Request) {
  const session = await requireApiUser();
  if (!session.ok) return NextResponse.json({ error: session.message }, { status: session.status });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "restaurantId required" }, { status: 422 });
  const member = await getRestaurantForMember(session.userId, parsed.data.restaurantId);
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let stripe: ReturnType<typeof requireStripe>;
  try {
    stripe = requireStripe();
  } catch {
    return NextResponse.json({ error: "Card payments aren't switched on yet. Nothing has been charged." }, { status: 503 });
  }
  const product = await kobProduct(stripe).catch(() => null);
  if (!product) return NextResponse.json({ error: "Card payments aren't switched on yet. Nothing has been charged." }, { status: 503 });

  const restaurant = await prisma.restaurant.findUniqueOrThrow({
    where: { id: member.id },
    select: { id: true, countryCode: true, trialEndsAt: true, billingStatus: true, stripeCustomerId: true },
  });
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { email: true } });
  const email = user?.email?.trim();
  if (!email) return NextResponse.json({ error: "Account email missing" }, { status: 400 });

  const price = priceForCountry(restaurant.countryCode);
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(req.url).origin;
  const r = encodeURIComponent(restaurant.id);
  try {
    const checkout = await createSubscriptionCheckoutSession({
      stripe,
      restaurantId: restaurant.id,
      customerEmail: email,
      existingStripeCustomerId: restaurant.stripeCustomerId,
      product,
      currency: price.currency,
      amount: price.amount,
      trialEndsAt: restaurant.billingStatus === "TRIALING" ? restaurant.trialEndsAt : null,
      origin,
      successPath: `/dashboard/billing?r=${r}&checkout=success`,
      cancelPath: `/dashboard/billing?r=${r}&checkout=cancel`,
    });
    if (!checkout.url) return NextResponse.json({ error: "Stripe did not return a checkout link" }, { status: 502 });
    return NextResponse.json({ url: checkout.url, price: price.label });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Checkout failed" }, { status: 502 });
  }
}
