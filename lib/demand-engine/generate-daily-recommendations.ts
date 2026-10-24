/**
 * Daily offer ideas for the restaurant's genuinely quiet nights, in its own currency and sized to its prices.
 * Never on a busy night or a day the owner said never to discount. When KOB doesn't know which nights are quiet,
 * it suggests nothing (the brief asks the owner instead). At most 3 waiting at once.
 */

import { prisma } from "@/lib/db/prisma";
import type { StructuredOffer } from "@/lib/demand-engine/types";
import { currencyForCountry } from "@/lib/commerce/currency";
import { localDay } from "@/lib/kob/talk/restaurant-facts";
import { nightsProfile, setMenuPrice, spendPerHead, WEEKDAY_NAME, WEEKDAYS, type Weekday } from "@/lib/venue/nights";

export const MAX_PENDING_DEMAND_RECS = 3;

type Candidate = {
  title: string;
  reason: string;
  /** Internal ordering weight only — never shown to owners as a measured figure. */
  impactScore: number;
  templateKey: string;
  offer: StructuredOffer;
};

const DAY_MS = 86_400_000;

/** ISO-ish week number, so ideas rotate week to week instead of repeating. */
const weekNumber = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / (7 * DAY_MS));

/** The next local date (YYYY-MM-DD) that falls on `day`, from `today`. */
function nextDate(today: string, todayWeekday: number, day: Weekday): string {
  const ahead = (WEEKDAYS.indexOf(day) - todayWeekday + 7) % 7 || 7;
  return new Date(Date.parse(`${today}T00:00:00Z`) + ahead * DAY_MS).toISOString().slice(0, 10);
}

export function buildCandidates(input: {
  name: string;
  cuisine: string;
  city: string;
  currency: string;
  locale: string;
  quiet: Weekday[];
  today: string;
  todayWeekday: number;
  spend: number | null;
}): Candidate[] {
  const money = (n: number) => new Intl.NumberFormat(input.locale, { style: "currency", currency: input.currency, maximumFractionDigits: 0 }).format(n);
  const setPrice = setMenuPrice(input.spend);
  const out: Candidate[] = [];
  input.quiet.slice(0, 2).forEach((day, i) => {
    const d = WEEKDAY_NAME[day];
    const date = nextDate(input.today, input.todayWeekday, day);
    const validFrom = `${date}T00:00:00Z`;
    const validTo = `${date}T23:59:59Z`;
    const base = { validFrom, validTo, currency: input.currency, days: [day] };
    const ideas: Candidate[] = [
      {
        title: setPrice ? `${d} set menu · two courses for ${money(setPrice)}` : `${d} set menu · two courses, one price`,
        reason: `${d}s are quiet at ${input.name}. A set menu gives regulars an easy reason to book.${setPrice ? " Priced from your usual spend per head — change it before you approve." : " Tell KOB the price before you approve."}`,
        impactScore: 80,
        templateKey: `set_menu:${day}`,
        offer: {
          ...base,
          headline: setPrice ? `Two courses for ${money(setPrice)}` : "Two-course set menu",
          description: `${d} set menu at ${input.name}${setPrice ? `: two courses for ${money(setPrice)}` : ""}.`,
          discountType: "fixed_menu",
          ...(setPrice ? { discountValue: setPrice, discountLabel: money(setPrice) } : { discountLabel: "Set menu" }),
          daypart: "dinner",
          conditions: `${d} · Dine-in`,
          templateKey: `set_menu:${day}`,
        },
      },
      {
        title: `${d} early tables · dessert on us before 7pm`,
        reason: `Fills the first sitting on a quiet ${d} without touching the price of a main.`,
        impactScore: 74,
        templateKey: `early_dessert:${day}`,
        offer: {
          ...base,
          headline: "Dessert on us before 7pm",
          description: `Book before 7pm on ${d} at ${input.name} and dessert is on us.`,
          discountType: "bogo",
          discountLabel: "Free dessert",
          daypart: "dinner",
          conditions: `${d} · Seated before 7pm · One per guest`,
          templateKey: `early_dessert:${day}`,
        },
      },
      {
        title: `${d} bring-a-friend · their main half price`,
        reason: `Turns one regular into two covers on a quiet ${d}.`,
        impactScore: 70,
        templateKey: `bring_friend:${day}`,
        offer: {
          ...base,
          headline: "Bring a friend: their main half price",
          description: `On ${d}s at ${input.name}, bring a friend and their main is half price.`,
          discountType: "percent",
          discountValue: 50,
          discountLabel: "Friend's main half price",
          daypart: "dinner",
          conditions: `${d} · One per table · Dine-in`,
          templateKey: `bring_friend:${day}`,
        },
      },
      {
        title: `${d} regulars' night · a personal invite, no discount`,
        reason: `Some rooms fill best without a deal: invite the people who already love ${input.name}.`,
        impactScore: 66,
        templateKey: `regulars:${day}`,
        offer: {
          ...base,
          headline: `${d} regulars' night`,
          description: `A personal invite to our regulars for ${d} night at ${input.name}.`,
          discountType: "fixed_menu",
          discountLabel: "Regulars' night",
          daypart: "dinner",
          conditions: `${d} · Invite only`,
          templateKey: `regulars:${day}`,
        },
      },
    ];
    // Rotate which idea leads each week, so the brief doesn't repeat itself.
    const start = (weekNumber(input.today) + i) % ideas.length;
    out.push(...[...ideas.slice(start), ...ideas.slice(0, start)].slice(0, 2));
  });
  return out.slice(0, MAX_PENDING_DEMAND_RECS);
}

/**
 * Top up PENDING recommendations to at most 3. Skips templateKeys already pending.
 * Returns how many new rows were created.
 */
export async function generateDailyRecommendationsForRestaurant(restaurantId: string, opts: { now?: Date } = {}): Promise<{
  created: number;
  pending: number;
}> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { name: true, cuisineType: true, city: true, countryCode: true, timezone: true, locale: true },
  });
  if (!restaurant) return { created: 0, pending: 0 };
  const now = opts.now ?? new Date();
  const nights = await nightsProfile(restaurantId, now);

  // An owner who has since protected a day never sees a waiting offer for it.
  const pending = await prisma.demandRecommendation.findMany({ where: { restaurantId, status: "PENDING" }, select: { id: true, offer: true } });
  const clash = pending.filter((p) => ((p.offer as StructuredOffer).days ?? []).some((d) => nights.protectedDays.includes(d as Weekday)));
  if (clash.length) await prisma.demandRecommendation.updateMany({ where: { id: { in: clash.map((c) => c.id) } }, data: { status: "EXPIRED" } });

  const existing = await prisma.demandRecommendation.findMany({
    where: { restaurantId, status: "PENDING" },
    select: { id: true, templateKey: true, impactScore: true },
    orderBy: { impactScore: "desc" },
  });

  if (existing.length >= MAX_PENDING_DEMAND_RECS) {
    // Trim excess so owners never see more than ~3.
    const excess = existing.slice(MAX_PENDING_DEMAND_RECS);
    if (excess.length) {
      await prisma.demandRecommendation.updateMany({
        where: { id: { in: excess.map((e) => e.id) } },
        data: { status: "EXPIRED" },
      });
    }
    return { created: 0, pending: MAX_PENDING_DEMAND_RECS };
  }

  const fact = await prisma.osFact.findFirst({ where: { restaurantId, key: "price_point" }, orderBy: { lastUpdatedAt: "desc" } });
  const pricePoint = (fact?.valueJson as { text?: string } | null)?.text ?? null;
  const { date: today, weekday } = localDay(restaurant.timezone, now);
  const usedKeys = new Set(existing.map((e) => e.templateKey).filter(Boolean));
  const candidates = buildCandidates({
    name: restaurant.name,
    cuisine: restaurant.cuisineType?.trim() || "restaurant",
    city: restaurant.city?.trim() || "your area",
    currency: currencyForCountry(restaurant.countryCode),
    locale: restaurant.locale || "en-GB",
    quiet: nights.quiet,
    today,
    todayWeekday: weekday,
    spend: spendPerHead(pricePoint),
  }).filter((c) => !usedKeys.has(c.templateKey));

  const slots = MAX_PENDING_DEMAND_RECS - existing.length;
  const toCreate = candidates.slice(0, slots);
  if (!toCreate.length) {
    return { created: 0, pending: existing.length };
  }

  await prisma.demandRecommendation.createMany({
    data: toCreate.map((d) => ({
      restaurantId,
      title: d.title,
      reason: d.reason,
      impactScore: d.impactScore,
      templateKey: d.templateKey,
      offer: d.offer,
      expiresAt: new Date(Date.parse(d.offer.validTo)),
      status: "PENDING",
    })),
  });

  return { created: toCreate.length, pending: existing.length + toCreate.length };
}

/** Run for all restaurants with at least one team member (active workspaces). */
export async function generateDailyRecommendationsForAllRestaurants(): Promise<{
  restaurants: number;
  created: number;
}> {
  const restaurants = await prisma.restaurant.findMany({
    where: { members: { some: {} } },
    select: { id: true },
  });

  let created = 0;
  for (const r of restaurants) {
    const result = await generateDailyRecommendationsForRestaurant(r.id);
    created += result.created;
  }
  return { restaurants: restaurants.length, created };
}
