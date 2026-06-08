import type { SubscriptionPlan } from "@prisma/client";
import { planMeetsMinimum } from "@/lib/billing/plan-access";

/** Internal KOB sales ops — bypass Pro gate when env is set. */
export function isOutboundSalesMode(): boolean {
  return process.env.OUTBOUND_SALES_MODE === "1";
}

export function canUseOutboundWorkspace(plan: SubscriptionPlan): boolean {
  if (isOutboundSalesMode()) return true;
  return planMeetsMinimum(plan, "PRO");
}
