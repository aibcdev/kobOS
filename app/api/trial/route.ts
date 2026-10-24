import { SubscriptionPlan } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { FREE_TRIAL_LABEL } from "@/lib/billing/offer";
import { countryFromHeaders } from "@/lib/billing/regional-pricing";
import { recordTrialStarted, startTrial } from "@/lib/billing/trial";
import { ensureTodayBrief } from "@/lib/chief-of-staff/ensure-today-brief";
import { prisma } from "@/lib/db/prisma";
import { sendWelcome } from "@/lib/email/owner";
import { localeForCountry, normalizeCountryCode, resolveRestaurantTimezone } from "@/lib/geo/timezone";
import { hydrateRestaurantFromLinkedAudit } from "@/lib/restaurant/hydrate-from-audit";
import { limit, tooManyRequests } from "@/lib/security/rate-limit";
import { slugify } from "@/lib/utils/slugify";

export const runtime = "nodejs";

const bodySchema = z.object({
  restaurantName: z.string().min(1).max(200),
  city: z.string().max(120).optional().nullable(),
  visibilityAuditId: z.string().min(12).optional(),
});

/**
 * Start the 7-day free trial for the signed-in owner: creates (or reuses) their restaurant and starts the trial on
 * it. No card and no Stripe call — a card is only asked for in Billing, before the trial ends.
 */
export async function POST(req: Request) {
  const session = await requireApiUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }
  const rl = await limit(`trial:user:${session.userId}`, { windowSec: 3600, max: 3 });
  if (!rl.ok) return tooManyRequests(rl);

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


  // One account, one trial: a restaurant this user already owns is reused rather than minting another customer.
  const owned = await prisma.restaurant.findMany({
    where: { members: { some: { userId: session.userId, role: "OWNER" } } },
    orderBy: { createdAt: "desc" },
    select: { id: true, stripeSubscriptionId: true, trialStartedAt: true, stripeCustomerId: true },
  });
  const active = owned.find((r) => r.stripeSubscriptionId || r.trialStartedAt);
  if (active) {
    return NextResponse.json({
      success: true,
      mode: "existing",
      restaurantId: active.id,
      message: "You already have a KOB trial or plan. Taking you to it.",
    });
  }
  const reuse = owned[0] ?? null;
  const countryCode = normalizeCountryCode(countryFromHeaders(req.headers));

  const slugBase = slugify(parsed.data.restaurantName);

  try {
    const restaurant = await prisma.$transaction(async (tx) => {
      let created;
      if (reuse) {
        created = await tx.restaurant.update({
          where: { id: reuse.id },
          data: { name: parsed.data.restaurantName.trim(), city: parsed.data.city?.trim() || undefined },
        });
      } else {
        const slugExists = await tx.restaurant.findUnique({ where: { slug: slugBase } });
        const finalSlug = slugExists ? `${slugBase}-${Date.now().toString(36)}` : slugBase;
        const timezone = resolveRestaurantTimezone({ countryCode, state: null, utcOffsetMinutes: null, browserTimezone: null });
        created = await tx.restaurant.create({
          data: {
            name: parsed.data.restaurantName.trim(),
            slug: finalSlug,
            city: parsed.data.city?.trim() || undefined,
            countryCode,
            locale: localeForCountry(countryCode),
            timezone: timezone ?? undefined,
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
      }

      if (parsed.data.visibilityAuditId) {
        const audit = await tx.visibilityAudit.findUnique({ where: { id: parsed.data.visibilityAuditId } });
        if (!audit) {
          throw new Error("audit_not_found");
        }
        if (audit.leadEmail?.trim() && audit.leadEmail.trim().toLowerCase() !== email.toLowerCase()) {
          throw new Error("audit_email_mismatch");
        }
        if (!audit.leadEmail?.trim() && audit.restaurantId && audit.restaurantId !== created.id) {
          throw new Error("audit_email_mismatch");
        }
        await tx.visibilityAudit.update({
          where: { id: audit.id },
          data: { restaurantId: created.id },
        });
      }

      await startTrial(tx, created.id, session.userId);
      return created;
    });

    if (parsed.data.visibilityAuditId) {
      await hydrateRestaurantFromLinkedAudit(restaurant.id);
    }

    const after = await prisma.restaurant.findUniqueOrThrow({ where: { id: restaurant.id }, select: { trialEndsAt: true, billingStatus: true } });
    if (after.billingStatus === "TRIALING") void recordTrialStarted(restaurant.id).catch((e) => console.warn("[api/trial] funnel", e));
    if (after.billingStatus === "TRIALING") void sendWelcome(restaurant.id).catch((e) => console.warn("[welcome email]", e));
    void ensureTodayBrief(restaurant.id).catch((e) => console.error("[api/trial] brief", e));
    return NextResponse.json({
      success: true,
      mode: "trial",
      restaurantId: restaurant.id,
      trialEndsAt: after.trialEndsAt?.toISOString() ?? null,
      nextHref: `/app?r=${encodeURIComponent(restaurant.id)}`,
      message: `Your ${FREE_TRIAL_LABEL} has started. No card needed.`,
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
