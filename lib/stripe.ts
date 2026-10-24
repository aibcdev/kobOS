/**
 * App-wide Stripe entrypoint (facade). Prefer `@/lib/billing/*` for new code.
 */
export { getStripe, getStripeGrowthPriceId, getStripeTrialDays, requireStripe } from "@/lib/billing/stripe-server";
