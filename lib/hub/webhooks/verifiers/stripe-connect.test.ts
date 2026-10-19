import Stripe from "stripe";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fixture, whReq } from "@/tests/helpers/webhooks";
import { stripeConnectVerifier } from "./stripe-connect";

const raw = fixture("stripe-checkout-completed.json");

describe("stripe-connect verifier", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts a Connect signature and reads the connected account", async () => {
    vi.stubEnv("STRIPE_CONNECT_WEBHOOK_SECRET", "whsec_connect_test");
    const header = Stripe.webhooks.generateTestHeaderString({ payload: raw, secret: "whsec_connect_test" });
    expect(await stripeConnectVerifier.verify(whReq(raw, { "stripe-signature": header }))).toMatchObject({
      ok: true,
      events: [{ externalId: "evt_1Q2w3e4r5t6y", type: "checkout.session.completed", accountId: "acct_1TESTCONNECT" }],
    });
  });

  it("rejects the platform secret and stale signatures", async () => {
    vi.stubEnv("STRIPE_CONNECT_WEBHOOK_SECRET", "whsec_connect_test");
    const wrong = Stripe.webhooks.generateTestHeaderString({ payload: raw, secret: "whsec_platform" });
    expect(await stripeConnectVerifier.verify(whReq(raw, { "stripe-signature": wrong }))).toMatchObject({ ok: false, status: 401 });
    const old = Stripe.webhooks.generateTestHeaderString({ payload: raw, secret: "whsec_connect_test", timestamp: Math.floor(Date.now() / 1000) - 3600 });
    expect(await stripeConnectVerifier.verify(whReq(raw, { "stripe-signature": old }))).toMatchObject({ ok: false, status: 401 });
  });
});
