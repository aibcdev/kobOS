import type { SubscriptionPlan } from "@prisma/client";
import { planMeetsMinimum } from "@/lib/billing/plan-access";

/** Internal KOB sales ops — only when env is set. */
export function isOutboundSalesMode(): boolean {
  return process.env.OUTBOUND_SALES_MODE === "1";
}

/** Comma-separated emails that may receive sales-workspace OWNER when sales mode is on. */
export function isOutboundSalesAllowlisted(email: string | null | undefined): boolean {
  const raw = process.env.OUTBOUND_SALES_ALLOWLIST?.trim();
  if (!raw) return false;
  if (!email?.trim()) return false;
  const set = new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  return set.has(email.trim().toLowerCase());
}

export function canUseOutboundWorkspace(plan: SubscriptionPlan): boolean {
  if (isOutboundSalesMode()) return true;
  return planMeetsMinimum(plan, "PRO");
}

/** True when this restaurant id is the configured global sales workspace. */
export function isOutboundSalesWorkspace(restaurantId: string): boolean {
  const workspaceId = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
  return Boolean(workspaceId && workspaceId === restaurantId);
}
