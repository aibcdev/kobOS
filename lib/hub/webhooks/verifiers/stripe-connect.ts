import Stripe from "stripe";
import { badSignature, env, notConfigured } from "@/lib/hub/webhooks/crypto";
import type { Verifier } from "@/lib/hub/webhooks/types";

/** Connect endpoint (events carry `account`); separate from the platform billing webhook at /api/stripe/webhook. */
export const stripeConnectVerifier: Verifier = {
  provider: "stripe-connect",
  integrationProvider: "STRIPE_CONNECT",
  verify({ raw, headers }) {
    const secret = env("STRIPE_CONNECT_WEBHOOK_SECRET");
    if (!secret) return notConfigured("STRIPE_CONNECT_WEBHOOK_SECRET");
    let event: Stripe.Event;
    try {
      event = Stripe.webhooks.constructEvent(raw, headers.get("stripe-signature") ?? "", secret);
    } catch {
      return badSignature;
    }
    return { ok: true, events: [{ externalId: event.id, type: event.type, accountId: event.account ?? null, payload: event }] };
  },
};
