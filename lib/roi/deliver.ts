import { utcToZoned } from "@/lib/connectors/shared";
import { prisma } from "@/lib/db/prisma";
import { flag, flagDefault } from "@/lib/flags";
import { guardEmail, weeklyEmail, type WeeklyEmail } from "@/lib/roi/email";
import { addDays, lastCompletedWeek, saveWeek, snapshotOf, weekStartOf } from "@/lib/roi/ledger";
import { whatsappReceiptStatus } from "@/lib/roi/whatsapp";

/**
 * Spec 2 Phase 9 weekly delivery: Monday 08:30 in each restaurant's timezone, to its owners and admins, once per
 * week. The send is claimed on RoiWeek.sentAt before calling Resend and released if Resend fails, so retries and
 * overlapping ticks can't send twice.
 */

export const SEND_LOCAL_TIME = "08:30";
const WINDOW_MINUTES = 60;

/** Inside the Monday 08:30–09:30 local window. */
export function isDue(now: Date, timeZone: string): boolean {
  const local = utcToZoned(now, timeZone);
  if (weekStartOf(now, timeZone) !== local.slice(0, 10)) return false;
  const minutes = Number(local.slice(11, 13)) * 60 + Number(local.slice(14, 16));
  const [h, m] = SEND_LOCAL_TIME.split(":").map(Number);
  return minutes >= h * 60 + m && minutes < h * 60 + m + WINDOW_MINUTES;
}

/** Restaurants the flag allows: paid plans when the env default is on, plus any with an override turned on. */
export async function weeklyCandidates(): Promise<{ id: string; timezone: string }[]> {
  const overrides = await prisma.featureFlagOverride.findMany({ where: { name: "ROI_WEEKLY_EMAIL" }, select: { restaurantId: true, enabled: true } });
  const on = overrides.filter((o) => o.enabled).map((o) => o.restaurantId);
  const off = overrides.filter((o) => !o.enabled).map((o) => o.restaurantId);
  const where = flagDefault("ROI_WEEKLY_EMAIL")
    ? { OR: [{ subscriptionPlan: { not: "FREE" as const } }, { id: { in: on } }], id: { notIn: off } }
    : { id: { in: on } };
  return prisma.restaurant.findMany({ where, select: { id: true, timezone: true } });
}

export type DeliverResult = { status: "sent" | "already_sent" | "flag_off" | "no_recipients" | "empty_week" | "guard_failed"; weekStart: string; stray?: string[]; whatsapp?: "flag_off" | "no_channel" };

export type Sender = (msg: { to: string[]; subject: string; html: string; text: string }) => Promise<void>;

export const resendSender: Sender = async (msg) => {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error("RESEND_API_KEY missing");
  const from = process.env.ROI_FROM_EMAIL?.trim() || process.env.RESEND_FROM_EMAIL?.trim() || "KOB <hello@trykob.com>";
  const { Resend } = await import("resend");
  const { error } = await new Resend(key).emails.send({ from, ...msg });
  if (error) throw new Error(`Resend: ${error.message}`);
};

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://trykob.com";

/** Nothing worth a Monday email: no LIVE metric has a single row. */
function emptyWeek(email: WeeklyEmail, counts: number[]): boolean {
  return email.allowed.length <= 1 || counts.every((c) => c === 0);
}

export async function deliverWeek(restaurantId: string, weekStart?: string, opts: { send?: Sender; now?: Date } = {}): Promise<DeliverResult> {
  const now = opts.now ?? new Date();
  const restaurant = await prisma.restaurant.findUniqueOrThrow({
    where: { id: restaurantId },
    select: { name: true, timezone: true, locale: true, members: { where: { role: { in: ["OWNER", "ADMIN"] } }, select: { user: { select: { email: true } } } } },
  });
  const week = weekStart ?? lastCompletedWeek(now, restaurant.timezone);
  if (!(await flag("ROI_WEEKLY_EMAIL", restaurantId))) return { status: "flag_off", weekStart: week };

  const existing = await prisma.roiWeek.findUnique({ where: { restaurantId_weekStart: { restaurantId, weekStart: new Date(`${week}T00:00:00Z`) } }, select: { sentAt: true } });
  if (existing?.sentAt) return { status: "already_sent", weekStart: week };

  const to = [...new Set(restaurant.members.map((m) => m.user.email.trim().toLowerCase()).filter(Boolean))];
  if (!to.length) return { status: "no_recipients", weekStart: week };

  const row = await saveWeek(restaurantId, week, now);
  const snapshot = snapshotOf(row);
  const email = weeklyEmail({ restaurantName: restaurant.name, restaurantId, snapshot, locale: restaurant.locale, appUrl: appUrl() });
  const live = Object.values(snapshot.metrics).filter((m) => m.state === "LIVE");
  if (emptyWeek(email, live.map((m) => m.count))) return { status: "empty_week", weekStart: week };

  const guard = guardEmail(email, restaurant.name);
  if (!guard.ok) {
    console.error(`[roi] number guard blocked ${restaurantId} ${week}`, guard.stray);
    return { status: "guard_failed", weekStart: week, stray: guard.stray };
  }

  const claim = await prisma.roiWeek.updateMany({ where: { id: row.id, sentAt: null }, data: { sentAt: now } });
  if (claim.count === 0) return { status: "already_sent", weekStart: week };
  try {
    await (opts.send ?? resendSender)({ to, subject: email.subject, html: email.html, text: email.text });
  } catch (err) {
    await prisma.roiWeek.updateMany({ where: { id: row.id, sentAt: now }, data: { sentAt: null } });
    throw err;
  }
  return { status: "sent", weekStart: week, whatsapp: await whatsappReceiptStatus(restaurantId) };
}

/** For the tick: which restaurants are in their send window right now, and for which week. */
export function dueNow(candidates: { id: string; timezone: string }[], now: Date): { restaurantId: string; weekStart: string }[] {
  return candidates.filter((c) => isDue(now, c.timezone)).map((c) => ({ restaurantId: c.id, weekStart: addDays(weekStartOf(now, c.timezone), -7) }));
}
