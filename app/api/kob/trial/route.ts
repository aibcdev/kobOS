import { NextResponse } from "next/server";
import { getStripe, getStripeGrowthPriceId, getStripeTrialDays } from "@/lib/billing/stripe-server";

export const runtime = "nodejs";

/** Walkthrough: start a 3-day no-card trial. Stripe runs if keys exist; Talk always unlocks locally. */
export async function POST() {
  const trialDays = getStripeTrialDays() ?? 3;
  const trialEndsAt = new Date(Date.now() + trialDays * 86400000).toISOString();
  const stripe = getStripe();
  const priceId = getStripeGrowthPriceId();

  if (!stripe || !priceId) {
    return NextResponse.json({
      ok: true,
      card: false,
      trialDays,
      trialEndsAt,
      stripe: false,
    });
  }

  try {
    const customer = await stripe.customers.create({
      metadata: { kob: "no-card-trial" },
    });
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      trial_period_days: trialDays,
      trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
      payment_behavior: "default_incomplete",
      metadata: { kob: "no-card-trial" },
    });
    return NextResponse.json({
      ok: true,
      card: false,
      trialDays,
      trialEndsAt:
        subscription.trial_end != null
          ? new Date(subscription.trial_end * 1000).toISOString()
          : trialEndsAt,
      stripe: true,
      subscriptionId: subscription.id,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "stripe";
    return NextResponse.json({
      ok: true,
      card: false,
      trialDays,
      trialEndsAt,
      stripe: false,
      error: msg,
    });
  }
}
