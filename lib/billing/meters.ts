/**
 * Stripe usage meters. Core is a flat £79 / $99, so nothing is metered yet; when a usage-priced add-on ships this
 * reports its UsageEvent totals to Stripe Billing Meters. Until then it is a no-op so callers can already be wired.
 */
export type MeterReport = { reported: false; reason: "meters_disabled" };

export async function reportWeeklyUsage(input: { restaurantId: string; weekStart: string; costMicros: bigint }): Promise<MeterReport> {
  void input;
  return { reported: false, reason: "meters_disabled" };
}
