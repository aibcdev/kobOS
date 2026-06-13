import type Stripe from "stripe";
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

/** Create or reuse KOB Flex + Flat monthly prices in the current Stripe mode (test/live). */
export async function ensureStripeCatalog(stripe: Stripe): Promise<EnsuredStripePrices> {
  const liveOnly = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ?? false;
  const out: Partial<EnsuredStripePrices> = {};

  for (const plan of PRICING_PLANS) {
    const tier = plan.stripeTier;
    const existing = await findExistingPrice(stripe, tier, Boolean(liveOnly));
    if (existing) {
      out[tier === "starter" ? "STRIPE_PRICE_STARTER" : "STRIPE_PRICE_PRO"] = existing;
      continue;
    }

    const product = await stripe.products.create({
      name: `KOB ${plan.name}`,
      description: plan.description,
      metadata: { kob_tier: tier, kob_plan: plan.id },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.priceMonthly * 100,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: { kob_tier: tier, kob_plan: plan.id },
    });

    out[tier === "starter" ? "STRIPE_PRICE_STARTER" : "STRIPE_PRICE_PRO"] = price.id;
  }

  if (!out.STRIPE_PRICE_STARTER || !out.STRIPE_PRICE_PRO) {
    throw new Error("Failed to ensure both Stripe prices");
  }

  return out as EnsuredStripePrices;
}
