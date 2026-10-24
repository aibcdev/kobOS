import type Stripe from "stripe";
import type { BillingStatus, SubscriptionPlan } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

/** Stripe's subscription state → the restaurant's billing status. Only a card-backed subscription exists in Stripe. */
export function billingFromStripe(status: Stripe.Subscription.Status): { billingStatus: BillingStatus; plan: SubscriptionPlan } {
  switch (status) {
    case "active":
    case "trialing":
      // A card is on file; during our free trial the first charge waits for its end.
      return { billingStatus: "ACTIVE", plan: "PRO" };
    case "past_due":
    case "unpaid":
      return { billingStatus: "PAST_DUE", plan: "PRO" };
    default:
      return { billingStatus: "CANCELED", plan: "FREE" };
  }
}

/** Maps a Stripe subscription onto the restaurant (idempotent). */
export async function syncRestaurantFromStripeSubscription(sub: Stripe.Subscription): Promise<void> {
  const restaurantId = sub.metadata?.restaurantId?.trim();
  if (!restaurantId) return;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  const { billingStatus, plan } = billingFromStripe(sub.status);
  // An incomplete checkout (card not confirmed yet) doesn't change anything the owner sees.
  if (sub.status === "incomplete") return;
  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: {
      stripeSubscriptionId: billingStatus === "CANCELED" ? null : sub.id,
      ...(customerId ? { stripeCustomerId: customerId } : {}),
      billingStatus,
      subscriptionPlan: plan,
    },
  });
}
