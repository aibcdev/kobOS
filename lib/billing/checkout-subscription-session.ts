import type Stripe from "stripe";

export type CreateSubscriptionCheckoutParams = {
  stripe: Stripe;
  restaurantId: string;
  customerEmail: string;
  /** When missing, Stripe creates/links customer from email. */
  existingStripeCustomerId?: string | null;
  /** KOB's Stripe product; the price is set inline so any currency in the price table works. */
  product: string;
  /** ISO 4217, lower case. */
  currency: string;
  /** Monthly amount in major units (e.g. 79). */
  amount: number;
  /** While the free trial is still running, the first charge waits until it ends. */
  trialEndsAt?: Date | null;
  origin: string;
  successPath: string;
  cancelPath: string;
};

/** Stripe only accepts a trial end at least 48 hours away; closer than that, billing starts now. */
const MIN_TRIAL_LEAD_MS = 48 * 3_600_000;

/**
 * Checkout to add a card: a monthly subscription at the restaurant's own price. The card is always collected —
 * the free trial itself never goes through Stripe.
 */
export async function createSubscriptionCheckoutSession(p: CreateSubscriptionCheckoutParams): Promise<Stripe.Checkout.Session> {
  const base = p.origin.replace(/\/$/, "");
  const trialEnd = p.trialEndsAt && p.trialEndsAt.getTime() - Date.now() > MIN_TRIAL_LEAD_MS ? Math.floor(p.trialEndsAt.getTime() / 1000) : undefined;
  return p.stripe.checkout.sessions.create({
    mode: "subscription",
    customer: p.existingStripeCustomerId ?? undefined,
    customer_email: p.existingStripeCustomerId ? undefined : p.customerEmail,
    client_reference_id: p.restaurantId,
    line_items: [
      {
        quantity: 1,
        price_data: { product: p.product, currency: p.currency, unit_amount: Math.round(p.amount * 100), recurring: { interval: "month" } },
      },
    ],
    success_url: `${base}${p.successPath}`,
    cancel_url: `${base}${p.cancelPath}`,
    metadata: { restaurantId: p.restaurantId },
    subscription_data: { metadata: { restaurantId: p.restaurantId, kob_plan: "founding" }, ...(trialEnd ? { trial_end: trialEnd } : {}) },
    payment_method_collection: "always",
    allow_promotion_codes: true,
  });
}
