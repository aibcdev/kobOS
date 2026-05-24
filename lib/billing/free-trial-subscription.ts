import { prisma } from "@/lib/db/prisma";
import {
  getStripeGrowthPriceId,
  getStripeTrialDays,
  requireStripe,
} from "@/lib/billing/stripe-server";
import { syncRestaurantFromStripeSubscription } from "@/lib/billing/sync-stripe-subscription";

/** Creates or reuses Stripe customer, starts subscription with trial (API path — card optional until trial ends). */
export async function createFreeTrialSubscription(customerEmail: string, restaurantId: string) {
  const stripe = requireStripe();
  const priceId = getStripeGrowthPriceId();
  if (!priceId) {
    throw new Error("Set STRIPE_PRICE_STARTER, STRIPE_GROWTH_PRICE_ID, or STRIPE_PRICE_PRO for trials.");
  }

  const trialPeriodDays = getStripeTrialDays() ?? 7;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { stripeCustomerId: true },
  });
  if (!restaurant) {
    throw new Error("restaurant_not_found");
  }

  let customerId = restaurant.stripeCustomerId?.trim() || null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: customerEmail,
      metadata: { restaurantId },
    });
    customerId = customer.id;
    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { stripeCustomerId: customerId },
    });
  }

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    trial_period_days: trialPeriodDays,
    metadata: { restaurantId },
    trial_settings: {
      end_behavior: { missing_payment_method: "pause" },
    },
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
  });

  await syncRestaurantFromStripeSubscription(subscription);

  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;

  return {
    subscriptionId: subscription.id,
    customerId,
    trialEndsAt: trialEnd?.toISOString() ?? new Date(Date.now() + trialPeriodDays * 86400000).toISOString(),
  };
}

/** Cancels subscription immediately (e.g. user-aborted trial). */
export async function cancelStripeSubscription(subscriptionId: string) {
  const stripe = requireStripe();
  return stripe.subscriptions.cancel(subscriptionId);
}
