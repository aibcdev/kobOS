import type { BillingStatus, Prisma, SubscriptionPlan } from "@prisma/client";
import { TRIAL_DAYS } from "@/lib/billing/offer";
import { prisma } from "@/lib/db/prisma";

/**
 * The free trial lives on the restaurant: no card and no Stripe call to start it. When it ends without a card the
 * restaurant is TRIAL_ENDED — read-only, data kept — until the owner adds a card. Nothing is ever charged without one.
 */

const DAY = 86_400_000;
type Db = Prisma.TransactionClient | typeof prisma;

export type TrialState =
  | { kind: "trialing"; endsAt: Date; daysLeft: number }
  | { kind: "ended"; endedAt: Date }
  | { kind: "active" }
  | { kind: "past_due" }
  | { kind: "canceled" }
  | { kind: "none" };

type Billing = { billingStatus: BillingStatus; trialEndsAt: Date | null; subscriptionPlan: SubscriptionPlan };

export function trialState(r: Billing, now: Date = new Date()): TrialState {
  switch (r.billingStatus) {
    case "TRIALING":
      if (r.trialEndsAt && r.trialEndsAt > now) return { kind: "trialing", endsAt: r.trialEndsAt, daysLeft: Math.ceil((r.trialEndsAt.getTime() - now.getTime()) / DAY) };
      return { kind: "ended", endedAt: r.trialEndsAt ?? now };
    case "TRIAL_ENDED":
      return { kind: "ended", endedAt: r.trialEndsAt ?? now };
    case "ACTIVE":
      return { kind: "active" };
    case "PAST_DUE":
      return { kind: "past_due" };
    case "CANCELED":
      return { kind: "canceled" };
    default:
      return { kind: "none" };
  }
}

/**
 * Start the trial on a new restaurant, unless this owner has already had one (one trial per account).
 * Returns the end date, or null when no trial was started.
 */
export async function startTrial(db: Db, restaurantId: string, ownerUserId: string, now: Date = new Date()): Promise<Date | null> {
  const before = await db.restaurant.count({
    where: { id: { not: restaurantId }, trialStartedAt: { not: null }, members: { some: { userId: ownerUserId, role: "OWNER" } } },
  });
  if (before > 0) return null;
  const endsAt = new Date(now.getTime() + TRIAL_DAYS * DAY);
  await db.restaurant.update({
    where: { id: restaurantId },
    data: { subscriptionPlan: "TRIAL", billingStatus: "TRIALING", trialStartedAt: now, trialEndsAt: endsAt },
  });
  return endsAt;
}

/** Trials past their end with no card become TRIAL_ENDED. Returns the restaurants that just ended. */
export async function expireTrials(now: Date = new Date(), only?: string[]): Promise<{ id: string; name: string }[]> {
  const due = await prisma.restaurant.findMany({
    where: { billingStatus: "TRIALING", trialEndsAt: { lte: now }, ...(only ? { id: { in: only } } : {}) },
    select: { id: true, name: true },
  });
  if (due.length)
    await prisma.restaurant.updateMany({
      where: { id: { in: due.map((r) => r.id) }, billingStatus: "TRIALING" },
      data: { billingStatus: "TRIAL_ENDED", subscriptionPlan: "FREE" },
    });
  return due;
}

/**
 * Trials whose end falls in [now + aheadHours − windowHours, now + aheadHours): with an hourly job and the default
 * 48h/1h, each trial is found exactly once, two days before it ends (day 5 of 7) — the reminder email.
 */
export async function trialsEndingSoon(
  now: Date = new Date(),
  opts: { aheadHours?: number; windowHours?: number; only?: string[] } = {},
): Promise<{ id: string; name: string; trialEndsAt: Date }[]> {
  const ahead = (opts.aheadHours ?? 48) * 3_600_000;
  const window = (opts.windowHours ?? 1) * 3_600_000;
  const rows = await prisma.restaurant.findMany({
    where: {
      billingStatus: "TRIALING",
      trialEndsAt: { gte: new Date(now.getTime() + ahead - window), lt: new Date(now.getTime() + ahead) },
      ...(opts.only ? { id: { in: opts.only } } : {}),
    },
    select: { id: true, name: true, trialEndsAt: true },
  });
  return rows.map((r) => ({ ...r, trialEndsAt: r.trialEndsAt! }));
}

export type ActCheck = { ok: true } | { ok: false; code: "TRIAL_ENDED" | "PAST_DUE" | "CANCELED"; message: string };

/** Whether KOB may propose or publish for this restaurant right now. Reading and Talk keep working either way. */
export async function canAct(restaurantId: string, now: Date = new Date()): Promise<ActCheck> {
  const r = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { billingStatus: true, trialEndsAt: true, subscriptionPlan: true } });
  if (!r) return { ok: true };
  const s = trialState(r, now);
  if (s.kind === "ended") return { ok: false, code: "TRIAL_ENDED", message: "Your free trial has ended. Add a card in Billing to keep KOB running — nothing has been charged." };
  if (s.kind === "past_due") return { ok: false, code: "PAST_DUE", message: "Your last payment didn't go through. Update your card in Billing." };
  if (s.kind === "canceled") return { ok: false, code: "CANCELED", message: "Your plan is cancelled. Restart it in Billing." };
  return { ok: true };
}

/** Marketing funnel: one TRIAL_STARTED event per restaurant, attributed to the audit that brought it in. */
export async function recordTrialStarted(restaurantId: string): Promise<void> {
  if (await prisma.marketingFunnelEvent.findFirst({ where: { restaurantId, kind: "TRIAL_STARTED" }, select: { id: true } })) return;
  const audit = await prisma.visibilityAudit.findFirst({
    where: { restaurantId },
    orderBy: { createdAt: "desc" },
    select: { id: true, utmSource: true, utmMedium: true, utmCampaign: true, gclid: true },
  });
  await prisma.marketingFunnelEvent.create({
    data: {
      kind: "TRIAL_STARTED",
      source: audit?.utmSource || "",
      medium: audit?.utmMedium || "",
      campaign: audit?.utmCampaign || "",
      gclid: audit?.gclid || null,
      auditId: audit?.id || null,
      restaurantId,
      metrics: { card: false },
    },
  });
}
