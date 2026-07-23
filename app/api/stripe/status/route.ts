import { NextResponse } from "next/server";
import {
  getStripeGrowthPriceId,
  getStripePricePro,
  getStripePriceStarter,
  getStripe,
} from "@/lib/billing/stripe-server";
import { assertOpsStatusAccess } from "@/lib/ops/assert-ops-status-access";

/** Safe Stripe config check — never exposes secrets. Ops-gated in production. */
export async function GET(req: Request) {
  const denied = assertOpsStatusAccess(req);
  if (denied) return denied;

  const secret = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const webhook = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";

  return NextResponse.json({
    ok: Boolean(secret && webhook && secret.startsWith("sk_live_")),
    hasSecretKey: Boolean(secret),
    secretKeyLooksLive: secret.startsWith("sk_live_"),
    hasWebhookSecret: Boolean(webhook),
    webhookSecretLooksValid: webhook.startsWith("whsec_"),
    hasPublishableKey: Boolean(publishable),
    publishableLooksLive: publishable.startsWith("pk_live_"),
    hasPriceStarter: Boolean(getStripePriceStarter()),
    hasPricePro: Boolean(getStripePricePro()),
    hasGrowthPrice: Boolean(getStripeGrowthPriceId()),
    stripeClientReady: Boolean(getStripe()),
  });
}
