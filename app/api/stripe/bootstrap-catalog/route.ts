import { NextResponse } from "next/server";
import { ensureStripeCatalog } from "@/lib/billing/ensure-stripe-catalog";
import { requireStripe } from "@/lib/billing/stripe-server";

export const runtime = "nodejs";

/** One-time: create live KOB Flex + Flat products using production STRIPE_SECRET_KEY on Netlify. */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  if (!key.startsWith("sk_live_")) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY must be sk_live_ on production" }, { status: 503 });
  }

  try {
    const stripe = requireStripe();
    const prices = await ensureStripeCatalog(stripe);
    return NextResponse.json({
      ok: true,
      livemode: true,
      ...prices,
      STRIPE_GROWTH_PRICE_ID: prices.STRIPE_PRICE_STARTER,
      STRIPE_TRIAL_DAYS: "7",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[stripe/bootstrap-catalog]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
