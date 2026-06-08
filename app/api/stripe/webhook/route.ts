import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { Prisma, SubscriptionPlan } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ensureTodayBrief } from "@/lib/chief-of-staff/ensure-today-brief";
import { getStripe } from "@/lib/billing/stripe-server";
import { syncRestaurantFromStripeSubscription } from "@/lib/billing/sync-stripe-subscription";
import { hydrateRestaurantFromLinkedAudit } from "@/lib/restaurant/hydrate-from-audit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const stripe = getStripe();
  if (!secret || !stripe) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid signature";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const already = await prisma.stripeWebhookEvent.findUnique({ where: { id: event.id } });
  if (already) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const restaurantId = session.metadata?.restaurantId?.trim() ?? session.client_reference_id?.trim();
        if (!restaurantId) break;
        const customer = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        await prisma.restaurant.update({
          where: { id: restaurantId },
          data: {
            ...(customer ? { stripeCustomerId: customer } : {}),
            ...(subId ? { stripeSubscriptionId: subId } : {}),
          },
        });
        if (subId) {
          const full = await stripe.subscriptions.retrieve(subId);
          await syncRestaurantFromStripeSubscription(full);
        }
        void hydrateRestaurantFromLinkedAudit(restaurantId).catch((e) => console.error("[stripe] hydrate", e));
        void ensureTodayBrief(restaurantId).catch((e) => console.error("[stripe] brief", e));
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.trial_will_end": {
        await syncRestaurantFromStripeSubscription(event.data.object as Stripe.Subscription);
        if (event.type === "customer.subscription.trial_will_end") {
          const sub = event.data.object as Stripe.Subscription;
          console.info("[stripe] trial_will_end", {
            subscription: sub.id,
            restaurantId: sub.metadata?.restaurantId,
            trialEnd: sub.trial_end,
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const restaurantId = sub.metadata?.restaurantId?.trim();
        if (!restaurantId) break;
        await prisma.restaurant.update({
          where: { id: restaurantId },
          data: {
            subscriptionPlan: SubscriptionPlan.FREE,
            stripeSubscriptionId: null,
          },
        });
        break;
      }
      default:
        break;
    }

    try {
      await prisma.stripeWebhookEvent.create({
        data: { id: event.id, type: event.type },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return NextResponse.json({ received: true, duplicate: true });
      }
      throw e;
    }
  } catch (e) {
    console.error("stripe webhook handler", e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
