import { TRIAL_DAYS, TRIAL_DAYS_FREE } from "@/lib/billing/offer";

/** Shared trial length. Reads `TRIAL_DAYS` in `lib/billing/offer.ts` — do not hard-code a different number. */
export function getStripeTrialDays(): number {
  return TRIAL_DAYS;
}

export function trialPromise(): string {
  return `${TRIAL_DAYS_FREE} · No card · Cancel anytime`;
}
