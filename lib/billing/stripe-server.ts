import type { SubscriptionPlan } from "@prisma/client";
import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, { typescript: true });
  }
  return stripeSingleton;
}

export function requireStripe(): Stripe {
  const s = getStripe();
  if (!s) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return s;
}

export function getStripePriceStarter(): string | null {
  return process.env.STRIPE_PRICE_STARTER?.trim() || null;
}

export function getStripePricePro(): string | null {
  return process.env.STRIPE_PRICE_PRO?.trim() || null;
}

/** Primary paid tier for growth/trial flows; falls back to Starter price. */
export function getStripeGrowthPriceId(): string | null {
  return process.env.STRIPE_GROWTH_PRICE_ID?.trim() || getStripePriceStarter();
}

export function getStripeTrialDays(): number | undefined {
  const raw = process.env.STRIPE_TRIAL_DAYS?.trim();
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1 || n > 90) return undefined;
  return Math.floor(n);
}

export function subscriptionPlanFromPriceId(priceId: string | undefined): SubscriptionPlan | null {
  if (!priceId) return null;
  if (priceId === getStripePricePro()) return "PRO";
  if (priceId === getStripePriceStarter()) return "STARTER";
  return null;
}
