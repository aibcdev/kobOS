import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { houseRules } from "@/lib/kob/talk/restaurant-facts";

/**
 * Which nights are quiet and which are busy, so offers go where they help and never discount a full room.
 * The owner's word wins; connected bookings or sales come next; otherwise KOB doesn't know and asks.
 */

export const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export const WEEKDAY_NAME: Record<Weekday, string> = {
  SUN: "Sunday", MON: "Monday", TUE: "Tuesday", WED: "Wednesday", THU: "Thursday", FRI: "Friday", SAT: "Saturday",
};

export type NightsProfile = {
  quiet: Weekday[];
  busy: Weekday[];
  source: "owner" | "bookings" | "orders" | "unknown";
  /** Days no offer may discount: busy nights plus the owner's "never discount" rules. */
  protectedDays: Weekday[];
};

const QUIET_FACT = "nights.quiet";
const BUSY_FACT = "nights.busy";

async function ownerDays(restaurantId: string, key: string): Promise<Weekday[] | null> {
  const row = await prisma.osFact.findFirst({ where: { restaurantId, key }, orderBy: { lastUpdatedAt: "desc" } });
  const days = (row?.valueJson as { days?: string[] } | undefined)?.days;
  return days ? days.filter((d): d is Weekday => (WEEKDAYS as readonly string[]).includes(d)) : null;
}

/** The owner says which nights are quiet or busy (onboarding, Talk). A night can't be both. */
export async function setNights(restaurantId: string, kind: "quiet" | "busy", days: Weekday[], now = new Date()): Promise<void> {
  const other = kind === "quiet" ? BUSY_FACT : QUIET_FACT;
  const current = (await ownerDays(restaurantId, kind === "quiet" ? QUIET_FACT : BUSY_FACT)) ?? [];
  const merged = [...new Set([...current, ...days])];
  const otherDays = ((await ownerDays(restaurantId, other)) ?? []).filter((d) => !days.includes(d));
  await prisma.osFact.createMany({
    data: [
      { restaurantId, key: kind === "quiet" ? QUIET_FACT : BUSY_FACT, valueJson: { days: merged } as Prisma.InputJsonValue, source: "owner", lastUpdatedAt: now, freshness: "CURRENT" },
      { restaurantId, key: other, valueJson: { days: otherDays } as Prisma.InputJsonValue, source: "owner", lastUpdatedAt: now, freshness: "CURRENT" },
    ],
  });
}

/** Covers per weekday from the last 8 weeks of bookings (or orders); needs 4+ weeks to say anything. */
async function fromData(restaurantId: string, now: Date, timezone: string): Promise<{ quiet: Weekday[]; busy: Weekday[]; source: "bookings" | "orders" } | null> {
  const since = new Date(now.getTime() - 56 * 86_400_000);
  const weekday = (d: Date) => WEEKDAYS[new Date(new Date(d).toLocaleString("en-US", { timeZone: timezone })).getDay()];
  const bookings = await prisma.booking.findMany({
    where: { restaurantId, startsAt: { gte: since, lt: now }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
    select: { startsAt: true, partySize: true },
  });
  let source: "bookings" | "orders" = "bookings";
  let rows = bookings.map((b) => ({ at: b.startsAt, n: b.partySize }));
  if (rows.length < 20) {
    const orders = await prisma.order.findMany({ where: { restaurantId, placedAt: { gte: since, lt: now } }, select: { placedAt: true } }).catch(() => []);
    if (orders.length < 20) return null;
    rows = orders.map((o) => ({ at: o.placedAt, n: 1 }));
    source = "orders";
  }
  const span = (now.getTime() - Math.min(...rows.map((r) => r.at.getTime()))) / (7 * 86_400_000);
  if (span < 4) return null;
  const totals = Object.fromEntries(WEEKDAYS.map((d) => [d, 0])) as Record<Weekday, number>;
  for (const r of rows) totals[weekday(r.at)] += r.n;
  const open = WEEKDAYS.filter((d) => totals[d] > 0);
  if (open.length < 3) return null;
  const sorted = [...open].sort((a, b) => totals[a] - totals[b]);
  const median = totals[sorted[Math.floor(sorted.length / 2)]];
  return {
    quiet: sorted.filter((d) => totals[d] < median * 0.7).slice(0, 2),
    busy: [...sorted].reverse().filter((d) => totals[d] > median * 1.3).slice(0, 2),
    source,
  };
}

export async function nightsProfile(restaurantId: string, now = new Date()): Promise<NightsProfile> {
  const { timezone } = await prisma.restaurant.findUniqueOrThrow({ where: { id: restaurantId }, select: { timezone: true } });
  const [quietSaid, busySaid, rules] = await Promise.all([ownerDays(restaurantId, QUIET_FACT), ownerDays(restaurantId, BUSY_FACT), houseRules(restaurantId)]);
  const neverDiscount = rules.filter((r) => r.ruleType === "never_discount_day" && r.day).map((r) => r.day as Weekday);
  let quiet = quietSaid ?? [];
  let busy = busySaid ?? [];
  let source: NightsProfile["source"] = quietSaid?.length || busySaid?.length ? "owner" : "unknown";
  if (source === "unknown") {
    const data = await fromData(restaurantId, now, timezone);
    if (data) ({ quiet, busy, source } = data);
  }
  const protectedDays = [...new Set([...busy, ...neverDiscount])];
  return { quiet: quiet.filter((d) => !protectedDays.includes(d)), busy, source, protectedDays };
}

/** "R400–500", "£35-45", "$60" → the lower spend per head as a number, or null. */
export function spendPerHead(pricePoint: string | null): number | null {
  const m = pricePoint?.replace(/[,\s]/g, "").match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

/** A set-menu price that fits the room: about 60% of a typical spend, rounded to a price people expect to see. */
export function setMenuPrice(spend: number | null): number | null {
  if (!spend) return null;
  const raw = spend * 0.6;
  const step = raw >= 200 ? 10 : raw >= 50 ? 5 : 1;
  return Math.round(raw / step) * step;
}
