import type { SubscriptionPlan } from "@prisma/client";

const RANK: Record<SubscriptionPlan, number> = {
  FREE: 0,
  STARTER: 1,
  PRO: 2,
  // The trial is the full product.
  TRIAL: 2,
};

export function planMeetsMinimum(plan: SubscriptionPlan, minimum: SubscriptionPlan): boolean {
  return RANK[plan] >= RANK[minimum];
}

export function planLabel(plan: SubscriptionPlan): string {
  switch (plan) {
    case "FREE":
      return "Free";
    case "STARTER":
      return "Starter";
    case "PRO":
      return "Pro";
    case "TRIAL":
      return "Free trial";
    default:
      return plan;
  }
}
