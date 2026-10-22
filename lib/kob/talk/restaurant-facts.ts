import type { CustomerReview, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { TRIAL_DAYS } from "@/lib/billing/offer";
import { priceForCountry } from "@/lib/billing/regional-pricing";
import { currencyForCountry } from "@/lib/commerce/currency";
import { utcToZoned, zonedToUtc } from "@/lib/connectors/shared";

/**
 * Read-only facts about one restaurant for Talk: what the owner's own data says, nothing invented.
 * Every function is scoped by restaurantId; callers must have checked membership first.
 */

const DAY = 86_400_000;

export type Profile = {
  name: string;
  city: string | null;
  countryCode: string | null;
  currency: string;
  timezone: string;
  cuisine: string | null;
  pricePoint: string | null;
  audience: string | null;
  voice: string | null;
};

async function factText(restaurantId: string, key: string): Promise<string | null> {
  const row = await prisma.osFact.findFirst({ where: { restaurantId, key }, orderBy: { lastUpdatedAt: "desc" } });
  const v = row?.valueJson as unknown;
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "text" in v && typeof (v as { text: unknown }).text === "string") return (v as { text: string }).text;
  return null;
}

export async function loadProfile(restaurantId: string): Promise<Profile> {
  const r = await prisma.restaurant.findUniqueOrThrow({
    where: { id: restaurantId },
    select: { name: true, city: true, countryCode: true, timezone: true, cuisineType: true, vibe: true },
  });
  const [pricePoint, audience] = await Promise.all([factText(restaurantId, "price_point"), factText(restaurantId, "audience")]);
  return {
    name: r.name,
    city: r.city,
    countryCode: r.countryCode,
    currency: currencyForCountry(r.countryCode),
    timezone: r.timezone,
    cuisine: r.cuisineType,
    pricePoint,
    audience,
    voice: r.vibe,
  };
}

/** Start of the local week (Monday 00:00) or month in the restaurant's timezone, as a UTC instant. */
export function periodStart(period: "week" | "month" | "last_month", timezone: string, now: Date): Date {
  // utcToZoned gives local wall time as "YYYY-MM-DDTHH:mm:ss"; do calendar maths on it as if it were UTC.
  const local = new Date(`${utcToZoned(now, timezone).slice(0, 10)}T00:00:00Z`);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const day =
    period === "month"
      ? new Date(Date.UTC(y, m, 1))
      : period === "last_month"
        ? new Date(Date.UTC(y, m - 1, 1))
        : new Date(Date.UTC(y, m, local.getUTCDate() - ((local.getUTCDay() + 6) % 7)));
  return zonedToUtc(day.toISOString().slice(0, 19), timezone);
}

/** The restaurant's local calendar date (YYYY-MM-DD) and weekday (0 = Sunday). */
export function localDay(timezone: string, now: Date): { date: string; weekday: number } {
  const date = utcToZoned(now, timezone).slice(0, 10);
  return { date, weekday: new Date(`${date}T00:00:00Z`).getUTCDay() };
}

export type ReviewLine = { id: string; rating: number; reviewer: string | null; excerpt: string; reviewedAt: string | null; replied: boolean };

const line = (r: CustomerReview): ReviewLine => ({
  id: r.id,
  rating: r.rating,
  reviewer: r.reviewerName?.trim().split(/\s+/)[0] ?? null,
  excerpt: r.body.trim().slice(0, 160),
  reviewedAt: r.reviewedAt?.toISOString() ?? null,
  replied: r.replied,
});

export async function reviewSummary(restaurantId: string, since: Date, until: Date = new Date()) {
  const where: Prisma.CustomerReviewWhereInput = { restaurantId, reviewedAt: { gte: since, lt: until } };
  const [rows, unrepliedAll, total] = await Promise.all([
    prisma.customerReview.findMany({ where, orderBy: { reviewedAt: "desc" } }),
    prisma.customerReview.findMany({ where: { restaurantId, replied: false }, orderBy: [{ rating: "asc" }, { reviewedAt: "desc" }], take: 5 }),
    prisma.customerReview.aggregate({ where: { restaurantId }, _count: true, _avg: { rating: true } }),
  ]);
  const byRating = [1, 2, 3, 4, 5].map((stars) => ({ stars, count: rows.filter((r) => r.rating === stars).length }));
  const unrepliedCount = await prisma.customerReview.count({ where: { restaurantId, replied: false } });
  return {
    since: since.toISOString(),
    count: rows.length,
    average: rows.length ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / rows.length) * 10) / 10 : null,
    byRating,
    unrepliedInPeriod: rows.filter((r) => !r.replied).length,
    unrepliedTotal: unrepliedCount,
    worstUnreplied: unrepliedAll.map(line),
    allTime: { count: total._count, average: total._avg.rating ? Math.round(total._avg.rating * 10) / 10 : null },
  };
}

/** "the 1-star", "two star", "5★" → 1..5, or null. */
export function starsMentioned(text: string): number | null {
  const m = text.match(/\b([1-5])\s*[- ]?\s*(?:star|★)/i) ?? text.match(/\b(one|two|three|four|five)[- ]star/i);
  if (!m) return null;
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };
  return Number(m[1]) || words[m[1].toLowerCase()] || null;
}

const STOP = new Set(["the", "a", "an", "to", "about", "reply", "review", "star", "stars", "our", "my", "we", "with", "for", "and", "of", "on", "in", "said", "guest", "draft", "voice"]);

/** The review the owner means: by star rating and/or words from it, unreplied first, newest first. */
export async function findReview(restaurantId: string, opts: { rating?: number | null; text?: string | null }) {
  const rows = await prisma.customerReview.findMany({
    where: { restaurantId, ...(opts.rating ? { rating: opts.rating } : {}) },
    orderBy: [{ replied: "asc" }, { reviewedAt: "desc" }],
    take: 200,
  });
  const words = (opts.text ?? "")
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
  if (!words.length) return rows[0] ?? null;
  let best: { r: CustomerReview; score: number } | null = null;
  for (const r of rows) {
    const body = r.body.toLowerCase();
    const score = words.filter((w) => body.includes(w)).length;
    if (score > 0 && (!best || score > best.score)) best = { r, score };
  }
  return best?.r ?? (opts.rating ? rows[0] ?? null : null);
}

export async function googleConnection(restaurantId: string) {
  const row = await prisma.integration.findFirst({
    where: { restaurantId, provider: "GBP" },
    select: { status: true, externalAccountId: true, lastSuccessAt: true, metadata: true },
  });
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { id: restaurantId }, select: { googleBusinessUrl: true } });
  const state = !row ? "not_connected" : row.status === "CONNECTED" && row.externalAccountId ? "connected" : row.status === "CONNECTED" ? "pick_location" : "reconnect";
  return { state, lastSyncedAt: row?.lastSuccessAt?.toISOString() ?? null, listingUrl: restaurant.googleBusinessUrl };
}

export async function pendingApprovals(restaurantId: string) {
  const [actions, tasks] = await Promise.all([
    prisma.osAction.findMany({
      where: { restaurantId, status: "AWAITING_APPROVAL" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, title: true, actionType: true, createdAt: true },
    }),
    prisma.chiefOfStaffTask.findMany({
      where: { restaurantId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, title: true, category: true, createdAt: true },
    }),
  ]);
  return {
    approvals: actions.map((a) => ({ id: a.id, title: a.title, kind: a.actionType })),
    tasks: tasks.map((t) => ({ id: t.id, title: t.title, kind: t.category })),
  };
}

export async function latestBrief(restaurantId: string) {
  const brief = await prisma.dailyBriefSnapshot.findFirst({ where: { restaurantId }, orderBy: { briefDate: "desc" } });
  if (!brief) return null;
  const summary = (brief.summaryJson ?? {}) as Record<string, unknown>;
  return { date: brief.briefDate.toISOString().slice(0, 10), greeting: brief.greeting, headline: typeof summary.headline === "string" ? summary.headline : null };
}

export async function recentOffers(restaurantId: string) {
  const rows = await prisma.demandRecommendation.findMany({
    where: { restaurantId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { title: true, status: true, createdAt: true },
  });
  return rows.map((r) => ({ title: r.title, status: String(r.status), createdAt: r.createdAt.toISOString() }));
}

export async function contentQueue(restaurantId: string) {
  const rows = await prisma.generatedContent.findMany({
    where: { restaurantId, published: false },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { type: true, status: true, output: true },
  });
  return rows.map((r) => ({ type: String(r.type), status: String(r.status), preview: r.output.slice(0, 120) }));
}

/** Trial and price, from the restaurant row and the one price table. */
export async function planStatus(restaurantId: string, now: Date = new Date()) {
  const r = await prisma.restaurant.findUniqueOrThrow({
    where: { id: restaurantId },
    select: { subscriptionPlan: true, trialStartedAt: true, trialEndsAt: true, billingStatus: true, stripeSubscriptionId: true, countryCode: true },
  });
  const price = priceForCountry(r.countryCode);
  // Rows from before trialEndsAt existed: the end follows from the start.
  const trialEndsAt = r.trialEndsAt ?? (r.trialStartedAt ? new Date(r.trialStartedAt.getTime() + TRIAL_DAYS * DAY) : null);
  const daysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / DAY)) : null;
  return {
    plan: r.subscriptionPlan,
    billingStatus: r.billingStatus,
    trialStartedAt: r.trialStartedAt?.toISOString() ?? null,
    trialEndsAt: trialEndsAt?.toISOString() ?? null,
    trialDaysLeft: daysLeft,
    hasSubscription: Boolean(r.stripeSubscriptionId),
    price: { label: `${price.label}/mo`, currency: price.currency.toUpperCase(), amount: price.amount },
    localCurrency: currencyForCountry(r.countryCode),
  };
}

// ---- House rules -------------------------------------------------------------------------------

const DAYS: Record<string, string> = {
  mon: "MON", monday: "MON", mondays: "MON",
  tue: "TUE", tues: "TUE", tuesday: "TUE", tuesdays: "TUE",
  wed: "WED", wednesday: "WED", wednesdays: "WED",
  thu: "THU", thur: "THU", thurs: "THU", thursday: "THU", thursdays: "THU",
  fri: "FRI", friday: "FRI", fridays: "FRI",
  sat: "SAT", saturday: "SAT", saturdays: "SAT",
  sun: "SUN", sunday: "SUN", sundays: "SUN",
};

export type HouseRule = { id: string; text: string; ruleType: string; day: string | null };

/** "Never discount Fridays" → a NEVER rule offers check by day; anything else is kept as a note drafts must follow. */
export function parseHouseRule(text: string): { ruleType: string; day: string | null; never: boolean } {
  const t = text.toLowerCase();
  const day = Object.keys(DAYS).find((d) => new RegExp(`\\b${d}\\b`).test(t));
  const never = /\b(never|no|don'?t|do not|not on)\b/.test(t);
  if (never && day && /\b(discount|offer|deal|promo|promotion|% off|comp|free)\b/.test(t))
    return { ruleType: /\bcomp\b/.test(t) ? "never_comp_day" : "never_discount_day", day: DAYS[day], never: true };
  return { ruleType: "note", day: day ? DAYS[day] : null, never };
}

export async function houseRules(restaurantId: string): Promise<HouseRule[]> {
  const rows = await prisma.osRestaurantRule.findMany({
    where: { restaurantId, scope: "house", active: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => {
    const c = (r.conditionJson ?? {}) as { text?: string; day?: string };
    return { id: r.id, text: c.text ?? r.ruleType, ruleType: r.ruleType, day: c.day ?? null };
  });
}

export async function saveHouseRule(restaurantId: string, text: string, createdBy: string | null): Promise<{ rule: HouseRule; created: boolean }> {
  const clean = text.trim().replace(/\s+/g, " ").slice(0, 300);
  const parsed = parseHouseRule(clean);
  const existing = (await houseRules(restaurantId)).find((r) => r.text.toLowerCase() === clean.toLowerCase());
  if (existing) return { rule: existing, created: false };
  const row = await prisma.osRestaurantRule.create({
    data: {
      restaurantId,
      scope: "house",
      ruleType: parsed.ruleType,
      subjectType: parsed.ruleType === "note" ? "" : "offer",
      conditionJson: { text: clean, ...(parsed.day ? { day: parsed.day } : {}) },
      permissionLevel: parsed.never ? "NEVER" : "ASK",
      source: "owner",
      createdBy,
      lastConfirmedAt: new Date(),
    },
  });
  return { rule: { id: row.id, text: clean, ruleType: parsed.ruleType, day: parsed.day }, created: true };
}

/** Days the owner has said must never get a discount (e.g. ["FRI"]). */
export async function noDiscountDays(restaurantId: string): Promise<string[]> {
  return (await houseRules(restaurantId)).filter((r) => r.ruleType === "never_discount_day" && r.day).map((r) => r.day!);
}
