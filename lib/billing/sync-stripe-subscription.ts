import type Stripe from "stripe";
import { SubscriptionPlan } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { subscriptionPlanFromPriceId } from "@/lib/billing/stripe-server";

/** Maps Stripe subscription state to `Restaurant` billing fields (idempotent). */
export async function syncRestaurantFromStripeSubscription(sub: Stripe.Subscription): Promise<void> {
  const restaurantId = sub.metadata?.restaurantId?.trim();
  if (!restaurantId) return;

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  const priceId = sub.items.data[0]?.price?.id;

  let plan: SubscriptionPlan = SubscriptionPlan.FREE;
  if (sub.status === "active" || sub.status === "trialing" || sub.status === "past_due") {
    const mapped = subscriptionPlanFromPriceId(priceId);
    plan = mapped ?? SubscriptionPlan.STARTER;
  }

  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: {
      stripeSubscriptionId: sub.id,
      ...(customerId ? { stripeCustomerId: customerId } : {}),
      subscriptionPlan: plan,
    },
  });
}
