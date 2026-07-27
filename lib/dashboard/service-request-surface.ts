import { SubscriptionPlan } from "@prisma/client";
import { planMeetsMinimum } from "@/lib/billing/plan-access";
import { prisma } from "@/lib/db/prisma";
import type { ServiceRequestType } from "@prisma/client";
import { catalogItem } from "@/lib/credits/catalog";

/** Shared props for dashboard surfaces that one-click request a service. */
export async function getServiceRequestSurfaceState(
  restaurantId: string,
  subscriptionPlan: SubscriptionPlan,
  type: ServiceRequestType,
) {
  const open = await prisma.serviceRequest.findFirst({
    where: {
      restaurantId,
      type,
      status: { in: ["REQUESTED", "IN_PROGRESS"] },
    },
    select: { status: true },
    orderBy: { createdAt: "desc" },
  });
  const item = catalogItem(type);
  return {
    isPaid: planMeetsMinimum(subscriptionPlan, SubscriptionPlan.STARTER),
    openStatus: open?.status ?? null,
    creditCost: item?.creditCost ?? 15,
  };
}
