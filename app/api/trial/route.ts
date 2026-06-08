import { SubscriptionPlan } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { createFreeTrialSubscription } from "@/lib/billing/free-trial-subscription";
import { ensureTodayBrief } from "@/lib/chief-of-staff/ensure-today-brief";
import { getStripeGrowthPriceId, getStripePricePro, requireStripe } from "@/lib/billing/stripe-server";
import { createSubscriptionCheckoutSession } from "@/lib/billing/checkout-subscription-session";
import { prisma } from "@/lib/db/prisma";
import { hydrateRestaurantFromLinkedAudit } from "@/lib/restaurant/hydrate-from-audit";
import { slugify } from "@/lib/utils/slugify";

export const runtime = "nodejs";

const bodySchema = z.object({
  restaurantName: z.string().min(1).max(200),
  city: z.string().max(120).optional().nullable(),
  visibilityAuditId: z.string().min(12).optional(),
  /** `checkout` (default): return Stripe Checkout URL. `direct`: create subscription via API (card optional until trial end). */
  mode: z.enum(["checkout", "direct"]).optional(),
  tier: z.enum(["starter", "pro"]).optional(),
});

export async function POST(req: Request) {
  const session = await requireApiUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  const email = user?.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "Account email missing" }, { status: 400 });
  }

  const mode = parsed.data.mode ?? "checkout";

  const priceId =
    parsed.data.tier === "pro" ? getStripePricePro() ?? getStripeGrowthPriceId() : getStripeGrowthPriceId();
  if (!priceId) {
    return NextResponse.json(
      { error: "Set STRIPE_GROWTH_PRICE_ID or STRIPE_PRICE_STARTER (and STRIPE_PRICE_PRO for Pro tier)." },
      { status: 503 },
    );
  }

  let stripe: ReturnType<typeof requireStripe>;
  try {
    stripe = requireStripe();
  } catch {
    return NextResponse.json({ error: "Stripe is not configured (STRIPE_SECRET_KEY)." }, { status: 503 });
  }

  const slugBase = slugify(parsed.data.restaurantName);

  try {
    const restaurant = await prisma.$transaction(async (tx) => {
      const slugExists = await tx.restaurant.findUnique({ where: { slug: slugBase } });
      const finalSlug = slugExists ? `${slugBase}-${Date.now().toString(36)}` : slugBase;

      const created = await tx.restaurant.create({
        data: {
          name: parsed.data.restaurantName.trim(),
          slug: finalSlug,
          city: parsed.data.city?.trim() || undefined,
          subscriptionPlan: SubscriptionPlan.FREE,
        },
      });

      await tx.teamMember.create({
        data: {
          userId: session.userId,
          restaurantId: created.id,
          role: "OWNER",
        },
      });

      if (parsed.data.visibilityAuditId) {
        const audit = await tx.visibilityAudit.findUnique({ where: { id: parsed.data.visibilityAuditId } });
        if (!audit) {
          throw new Error("audit_not_found");
        }
        if (audit.leadEmail?.trim() && audit.leadEmail.trim().toLowerCase() !== email.toLowerCase()) {
          throw new Error("audit_email_mismatch");
        }
        await tx.visibilityAudit.update({
          where: { id: audit.id },
          data: { restaurantId: created.id },
        });
      }

      return created;
    });

    if (parsed.data.visibilityAuditId) {
      await hydrateRestaurantFromLinkedAudit(restaurant.id);
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      new URL(req.url).origin ||
      "http://localhost:3000";

    if (mode === "checkout") {
      const checkout = await createSubscriptionCheckoutSession({
        stripe,
        restaurantId: restaurant.id,
        customerEmail: email,
        existingStripeCustomerId: restaurant.stripeCustomerId,
        priceId,
        origin,
        successPath: `/dashboard?r=${encodeURIComponent(restaurant.id)}&welcome=1`,
        cancelPath: `/dashboard/billing?r=${encodeURIComponent(restaurant.id)}&checkout=cancel`,
      });
      if (!checkout.url) {
        return NextResponse.json({ error: "Stripe did not return a checkout URL" }, { status: 502 });
      }
      return NextResponse.json({
        success: true,
        mode: "checkout",
        checkoutUrl: checkout.url,
        restaurantId: restaurant.id,
        message: "Complete checkout to activate your trial.",
      });
    }

    const trial = await createFreeTrialSubscription(email, restaurant.id);
    if (parsed.data.visibilityAuditId) {
      void ensureTodayBrief(restaurant.id).catch((e) => console.error("[api/trial] brief", e));
    }
    return NextResponse.json({
      success: true,
      mode: "direct",
      subscriptionId: trial.subscriptionId,
      customerId: trial.customerId,
      restaurantId: restaurant.id,
      trialEndsAt: trial.trialEndsAt,
      message: "7-day free trial activated. Welcome to KOB!",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "audit_not_found") {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }
    if (msg === "audit_email_mismatch") {
      return NextResponse.json(
        { error: "This audit is tied to a different email. Run the audit with your account email." },
        { status: 403 },
      );
    }
    console.error("[api/trial]", e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
