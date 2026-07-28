import type Stripe from "stripe";
import { SubscriptionPlan } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { subscriptionPlanFromPriceId } from "@/lib/billing/stripe-server";

/** Maps Stripe subscription state to `Restaurant` billing fields (idempotent). */
export async function syncRestaurantFromStripeSubscription(sub: Stripe.Subscription): Promise<void> {
  const restaurantId = sub.metadata?.restaurantId?.trim();
  if (!restaurantId) return;

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  const priceId = sub.items.data[0]?.price?.id;

  let plan: SubscriptionPlan = SubscriptionPlan.FREE;
  if (sub.status === "active" || sub.status === "trialing" || sub.status === "past_due") {
    const mapped = subscriptionPlanFromPriceId(priceId);
    plan = mapped ?? SubscriptionPlan.STARTER;
  }

  const existing = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { trialStartedAt: true, subscriptionPlan: true },
  });

  const activatingPaid =
    plan !== SubscriptionPlan.FREE &&
    (existing?.subscriptionPlan === SubscriptionPlan.FREE || !existing?.trialStartedAt);

  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: {
      stripeSubscriptionId: sub.id,
      ...(customerId ? { stripeCustomerId: customerId } : {}),
      subscriptionPlan: plan,
      ...(activatingPaid && !existing?.trialStartedAt
        ? { trialStartedAt: new Date() }
        : {}),
    },
  });

  if (activatingPaid) {
    const linkedAudit = await prisma.visibilityAudit.findFirst({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        gclid: true,
      },
    });
    void prisma.marketingFunnelEvent
      .create({
        data: {
          kind: "TRIAL_STARTED",
          source: linkedAudit?.utmSource || "",
          medium: linkedAudit?.utmMedium || "",
          campaign: linkedAudit?.utmCampaign || "",
          gclid: linkedAudit?.gclid || null,
          auditId: linkedAudit?.id || null,
          restaurantId,
          metrics: { stripeSubscriptionId: sub.id, plan, stripeStatus: sub.status },
        },
      })
      .catch((e) => console.warn("[stripe sync] funnel trial event", e));
  }
}
