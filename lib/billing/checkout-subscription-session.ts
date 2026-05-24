import type Stripe from "stripe";
import {
  getStripeTrialDays,
} from "@/lib/billing/stripe-server";

export type CreateSubscriptionCheckoutParams = {
  stripe: Stripe;
  restaurantId: string;
  customerEmail: string;
  /** When missing, Stripe creates/links customer from email. */
  existingStripeCustomerId?: string | null;
  priceId: string;
  origin: string;
  successPath: string;
  cancelPath: string;
};

/** Shared Checkout Session for subscription + optional trial (used by billing + /api/trial). */
export async function createSubscriptionCheckoutSession(
  p: CreateSubscriptionCheckoutParams,
): Promise<Stripe.Checkout.Session> {
  const trialDays = getStripeTrialDays();
  const base = p.origin.replace(/\/$/, "");

  return p.stripe.checkout.sessions.create({
    mode: "subscription",
    customer: p.existingStripeCustomerId ?? undefined,
    customer_email: p.existingStripeCustomerId ? undefined : p.customerEmail,
    client_reference_id: p.restaurantId,
    line_items: [{ price: p.priceId, quantity: 1 }],
    success_url: `${base}${p.successPath}`,
    cancel_url: `${base}${p.cancelPath}`,
    metadata: { restaurantId: p.restaurantId },
    subscription_data: {
      metadata: { restaurantId: p.restaurantId },
      ...(trialDays
        ? {
            trial_period_days: trialDays,
            trial_settings: {
              end_behavior: { missing_payment_method: "pause" },
            },
          }
        : {}),
    },
    ...(trialDays ? { payment_method_collection: "if_required" as const } : {}),
    allow_promotion_codes: true,
  });
}
