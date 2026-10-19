/** Shared trial length. Marketing copy must read this — do not hard-code a different number. */
export function getStripeTrialDays(): number {
  return 7;
}

export function trialPromise(): string {
  const days = getStripeTrialDays();
  return `${days} days free · No card · Cancel anytime`;
}
