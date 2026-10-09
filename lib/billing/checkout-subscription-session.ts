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
  /** Required to bill a multi-currency price in a non-default currency. */
  currency?: "gbp" | "usd";
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
    currency: p.currency,
    success_url: `${base}${p.successPath}`,
    cancel_url: `${base}${p.cancelPath}`,
    metadata: { restaurantId: p.restaurantId },
    subscription_data: {
      metadata: { restaurantId: p.restaurantId },
      trial_period_days: trialDays,
      trial_settings: {
        end_behavior: { missing_payment_method: "cancel" },
      },
    },
    // 7-day trial: no card required to start.
    payment_method_collection: "if_required",
    allow_promotion_codes: true,
  });
}
