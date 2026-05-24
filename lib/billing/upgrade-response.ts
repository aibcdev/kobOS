import type { SubscriptionPlan } from "@prisma/client";
import { NextResponse } from "next/server";

export function jsonUpgradeRequired(minimumPlan: SubscriptionPlan, currentPlan: SubscriptionPlan) {
  return NextResponse.json(
    { error: "upgrade_required", minimumPlan, currentPlan },
    { status: 402 },
  );
}
