import { FOUNDING_PRICES } from "@/lib/billing/regional-pricing";

/**
 * Single source for trial length and offer copy (client-safe; no Stripe import).
 * DECISION: 7-day trial with no card up front — Checkout uses `payment_method_collection: "if_required"`.
 */
export const TRIAL_DAYS = 7;

export const TRIAL_LABEL = `${TRIAL_DAYS}-day trial`;
export const FREE_TRIAL_LABEL = `${TRIAL_DAYS}-day free trial`;
export const START_FREE_TRIAL = `Start ${FREE_TRIAL_LABEL}`;
export const TRIAL_DAYS_FREE = `${TRIAL_DAYS} days free`;

/** "£79/mo in the UK, $99/mo elsewhere" */
export const FOUNDING_PRICE_LINE = `${FOUNDING_PRICES.GB.label}/mo in the UK, ${FOUNDING_PRICES.US.label}/mo elsewhere`;
