import type Stripe from "stripe";
import { FOUNDING_PRICES } from "@/lib/billing/regional-pricing";
import { PRICING_PLANS } from "@/lib/marketing/pricing-plans";

export type EnsuredStripePrices = {
  STRIPE_PRICE_STARTER: string;
  STRIPE_PRICE_PRO: string;
};

async function findExistingPrice(stripe: Stripe, tier: string, liveOnly: boolean): Promise<string | null> {
  const prices = await stripe.prices.list({ limit: 100, active: true });
  for (const price of prices.data) {
    if (price.metadata?.kob_tier !== tier) continue;
    if (price.recurring?.interval !== "month") continue;
    if (liveOnly && !price.livemode) continue;
    return price.id;
  }
  return null;
}

/** Create or reuse KOB founding monthly price (USD + GBP option) in the current Stripe mode. */
export async function ensureStripeCatalog(stripe: Stripe): Promise<EnsuredStripePrices> {
  const liveOnly = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ?? false;
  const plan = PRICING_PLANS[0];
  if (!plan) throw new Error("No pricing plan configured");

  const tier = plan.stripeTier;
  let existing = await findExistingPrice(stripe, tier, Boolean(liveOnly));
  if (!existing) {
    const product = await stripe.products.create({
      name: `KOB ${plan.name}`,
      description: plan.description,
      metadata: { kob_tier: tier, kob_plan: plan.id },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: FOUNDING_PRICES.US.amount * 100,
      currency: FOUNDING_PRICES.US.currency,
      currency_options: {
        [FOUNDING_PRICES.GB.currency]: { unit_amount: FOUNDING_PRICES.GB.amount * 100 },
      },
      recurring: { interval: "month" },
      metadata: { kob_tier: tier, kob_plan: plan.id },
    });
    existing = price.id;
  }

  // Founding maps to PRO; keep STARTER alias for older env wiring.
  return {
    STRIPE_PRICE_PRO: existing,
    STRIPE_PRICE_STARTER: existing,
  };
}
