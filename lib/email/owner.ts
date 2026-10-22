import { Prisma } from "@prisma/client";
import { priceForCountry } from "@/lib/billing/regional-pricing";
import { bannedWordsIn } from "@/lib/copy/banned-words";
import { prisma } from "@/lib/db/prisma";
import { transport } from "@/lib/email/transport";
import {
  dailyBriefEmail,
  links,
  publishedEmail,
  reconnectGoogleEmail,
  trialEndedEmail,
  trialEndingEmail,
  weeklySummaryEmail,
  welcomeEmail,
  type Email,
  type Links,
} from "@/lib/email/templates";

/**
 * Sends one kind of owner email once. Each recipient gets their own message (owners and admins never see each
 * other's addresses). The OwnerEmail row is written first, so a retry or a second job finds it and skips.
 */

export type OwnerEmailKind = "welcome" | "daily_brief" | "weekly_summary" | "trial_ending" | "trial_ended" | "published" | "reconnect_google";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://trykob.com";

type Venue = { id: string; name: string; timezone: string; countryCode: string | null; locale: string; recipients: string[]; links: Links };

async function venue(restaurantId: string): Promise<Venue> {
  const r = await prisma.restaurant.findUniqueOrThrow({
    where: { id: restaurantId },
    select: {
      id: true,
      name: true,
      timezone: true,
      countryCode: true,
      locale: true,
      members: { where: { role: { in: ["OWNER", "ADMIN"] } }, select: { user: { select: { email: true } } } },
    },
  });
  const recipients = [...new Set(r.members.map((m) => m.user.email.trim().toLowerCase()).filter(Boolean))];
  return { ...r, recipients, links: links(appUrl(), r.id) };
}

const localDate = (d: Date, v: Venue) => d.toLocaleDateString(v.locale || "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: v.timezone });

export type SendOutcome = { kind: OwnerEmailKind; sent: number; skipped: number; dryRun: number; blocked?: string[] };

export async function sendOwnerEmail(v: Venue, kind: OwnerEmailKind, dedupeKey: string, email: Email): Promise<SendOutcome> {
  const out: SendOutcome = { kind, sent: 0, skipped: 0, dryRun: 0 };
  // Never send copy with words owners shouldn't see; fail closed and say why.
  const banned = bannedWordsIn(`${email.subject}\n${email.text}`);
  if (banned.length) {
    console.error(`[owner-email] ${kind} blocked: banned words ${banned.join(", ")}`);
    return { ...out, blocked: banned };
  }
  for (const to of v.recipients) {
    const key = `${dedupeKey}:${to}`;
    let row;
    try {
      row = await prisma.ownerEmail.create({ data: { restaurantId: v.id, kind, dedupeKey: key, recipient: to, subject: email.subject, status: "PENDING" } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        out.skipped++;
        continue;
      }
      throw e;
    }
    try {
      const res = await transport()({ to, subject: email.subject, html: email.html, text: email.text, idempotencyKey: key.slice(0, 256) });
      await prisma.ownerEmail.update({ where: { id: row.id }, data: { status: res.status, providerId: res.providerId ?? null } });
      if (res.status === "SENT") out.sent++;
      else out.dryRun++;
    } catch (e) {
      // Free the key so the next run can try again.
      await prisma.ownerEmail.update({ where: { id: row.id }, data: { status: "FAILED", error: e instanceof Error ? e.message.slice(0, 500) : "send failed", dedupeKey: `${key}:failed:${row.id}` } });
    }
  }
  return out;
}

export async function sendWelcome(restaurantId: string): Promise<SendOutcome> {
  const v = await venue(restaurantId);
  const r = await prisma.restaurant.findUniqueOrThrow({ where: { id: restaurantId }, select: { trialEndsAt: true } });
  return sendOwnerEmail(
    v,
    "welcome",
    `welcome:${restaurantId}`,
    welcomeEmail({ name: v.name, trialEnds: r.trialEndsAt ? localDate(r.trialEndsAt, v) : "in 7 days", price: priceForCountry(v.countryCode).label, links: v.links }),
  );
}

/** The morning brief: what's waiting for approval and today's list. Skipped on a day with nothing for the owner. */
export async function sendDailyBrief(restaurantId: string, now: Date = new Date()): Promise<SendOutcome & { empty?: boolean }> {
  const v = await venue(restaurantId);
  const { ensureTodayBrief } = await import("@/lib/chief-of-staff/ensure-today-brief");
  const brief = await ensureTodayBrief(restaurantId, false, now);
  const approvals = await prisma.osAction.findMany({
    where: { restaurantId, status: "AWAITING_APPROVAL" },
    orderBy: [{ riskScore: "desc" }, { createdAt: "asc" }],
    take: 10,
    select: { id: true, title: true },
  });
  const tasks = brief.tasks.filter((t) => t.status === "PENDING").map((t) => t.title);
  const needToKnow = brief.summary.needToKnow ?? [];
  if (!approvals.length && !tasks.length) return { kind: "daily_brief", sent: 0, skipped: 0, dryRun: 0, empty: true };
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: v.timezone }).format(now);
  return sendOwnerEmail(v, "daily_brief", `brief:${restaurantId}:${day}`, dailyBriefEmail({ name: v.name, greeting: brief.greeting, needToKnow, approvals, tasks, links: v.links }));
}

export async function sendWeeklySummary(restaurantId: string, now: Date = new Date()): Promise<SendOutcome> {
  const v = await venue(restaurantId);
  const { periodStart } = await import("@/lib/kob/talk/restaurant-facts");
  const weekStart = periodStart("week", v.timezone, now);
  const lastWeek = new Date(weekStart.getTime() - 7 * 86_400_000);
  const [thisWeek, before, published, waiting] = await Promise.all([
    prisma.customerReview.count({ where: { restaurantId, reviewedAt: { gte: lastWeek, lt: weekStart } } }),
    prisma.customerReview.count({ where: { restaurantId, reviewedAt: { gte: new Date(lastWeek.getTime() - 7 * 86_400_000), lt: lastWeek } } }),
    prisma.osAction.count({ where: { restaurantId, status: "VERIFIED", verifiedAt: { gte: lastWeek, lt: weekStart } } }),
    prisma.osAction.count({ where: { restaurantId, status: "AWAITING_APPROVAL" } }),
  ]);
  const week = new Intl.DateTimeFormat("en-CA", { timeZone: v.timezone }).format(weekStart);
  return sendOwnerEmail(v, "weekly_summary", `weekly:${restaurantId}:${week}`, weeklySummaryEmail({ name: v.name, reviewsThisWeek: thisWeek, reviewsLastWeek: before, published, waiting, links: v.links }));
}

export async function sendTrialEnding(restaurantId: string): Promise<SendOutcome> {
  const v = await venue(restaurantId);
  const r = await prisma.restaurant.findUniqueOrThrow({ where: { id: restaurantId }, select: { trialEndsAt: true, billingStatus: true } });
  if (r.billingStatus !== "TRIALING" || !r.trialEndsAt) return { kind: "trial_ending", sent: 0, skipped: 0, dryRun: 0 };
  return sendOwnerEmail(v, "trial_ending", `trial-ending:${restaurantId}`, trialEndingEmail({ name: v.name, ends: localDate(r.trialEndsAt, v), price: priceForCountry(v.countryCode).label, links: v.links }));
}

export async function sendTrialEnded(restaurantId: string): Promise<SendOutcome> {
  const v = await venue(restaurantId);
  return sendOwnerEmail(v, "trial_ended", `trial-ended:${restaurantId}`, trialEndedEmail({ name: v.name, price: priceForCountry(v.countryCode).label, links: v.links }));
}

const WHERE: Record<string, string> = {
  "gbp.review.reply": "your Google reviews",
  "gbp.hours.regular.update": "your Google listing",
  "gbp.hours.special.set": "your Google listing",
  "gbp.post.create": "your Google listing",
  "gbp.profile.description.update": "your Google listing",
};

/** After an approved change is read back as live. Best-effort: never fails the action. */
export async function sendPublished(actionId: string): Promise<SendOutcome | null> {
  const a = await prisma.osAction.findUnique({ where: { id: actionId }, select: { id: true, restaurantId: true, title: true, actionType: true, status: true } });
  if (!a || a.status !== "VERIFIED") return null;
  const v = await venue(a.restaurantId);
  return sendOwnerEmail(v, "published", `published:${a.id}`, publishedEmail({ name: v.name, title: a.title, where: WHERE[a.actionType] ?? "the right place", actionId: a.id, links: v.links }));
}

export async function sendReconnectGoogle(restaurantId: string, now: Date = new Date()): Promise<SendOutcome> {
  const v = await venue(restaurantId);
  // At most one reminder a week while it stays disconnected.
  const week = Math.floor(now.getTime() / (7 * 86_400_000));
  return sendOwnerEmail(v, "reconnect_google", `reconnect-google:${restaurantId}:${week}`, reconnectGoogleEmail({ name: v.name, links: v.links }));
}
