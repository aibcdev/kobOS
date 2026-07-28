/**
 * Phase 2 — daily Demand recommendations (quiet windows, weather, history templates).
 * Caps at 3 pending cards. Not a deals marketplace — AI growth manager for quiet periods.
 */

import { prisma } from "@/lib/db/prisma";
import type { StructuredOffer } from "@/lib/demand-engine/types";

export const MAX_PENDING_DEMAND_RECS = 3;

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

type Candidate = {
  title: string;
  reason: string;
  confidence: number;
  impactScore: number;
  estimatedExtraCustomers: number;
  estimatedExtraRevenue: number;
  templateKey: string;
  offer: StructuredOffer;
};

function buildCandidates(input: {
  name: string;
  cuisine: string;
  city: string;
  weekday: number;
  rainyHint: boolean;
}): Candidate[] {
  const { name, cuisine, city, weekday, rainyHint } = input;
  const now = new Date();
  const validFrom = now.toISOString();
  const validTo = daysFromNow(3).toISOString();
  const out: Candidate[] = [];

  // 0=Sun … 2=Tue
  if (weekday === 2 || weekday === 3) {
    out.push({
      title: "Free dessert with any main · Tue–Wed 5–7pm",
      reason: `Tuesdays and Wednesdays 5–7pm are typically your quietest window in ${city}. A simple sweetener usually lifts covers without training the brand.`,
      confidence: 82,
      impactScore: 80,
      estimatedExtraCustomers: 12,
      estimatedExtraRevenue: 180,
      templateKey: "quiet_midweek",
      offer: {
        headline: "Free dessert with any main",
        description: `Free dessert with mains Tue–Wed 5–7pm at ${name}.`,
        discountType: "bogo",
        discountLabel: "Free dessert",
        daypart: "dinner",
        conditions: "Tue–Wed · 5–7pm · Dine-in · One per guest",
        validFrom,
        validTo,
        templateKey: "quiet_midweek",
      },
    });
  }

  if (weekday >= 1 && weekday <= 5) {
    out.push({
      title: "£12 lunch deal · Mon–Fri 12–3pm",
      reason: `Nearby workers need a clear weekday lunch. A fixed deal fills the quiet midday window for ${cuisine} spots in ${city}.`,
      confidence: 74,
      impactScore: 68,
      estimatedExtraCustomers: 16,
      estimatedExtraRevenue: 200,
      templateKey: "lunch_special",
      offer: {
        headline: "£12 lunch deal",
        description: "Main + soft drink for £12, Mon–Fri 12–3pm.",
        discountType: "fixed_menu",
        discountValue: 12,
        discountLabel: "£12 lunch",
        daypart: "lunch",
        conditions: "Mon–Fri · 12–3pm · While stocks last",
        validFrom,
        validTo: daysFromNow(5).toISOString(),
        templateKey: "lunch_special",
      },
    });
  }

  if (rainyHint || weekday === 0 || weekday === 6) {
    out.push({
      title: "Rainy-day free side",
      reason: "Wet weather and weekends often lift early dinner interest — reward guests who still come out.",
      confidence: 70,
      impactScore: 62,
      estimatedExtraCustomers: 10,
      estimatedExtraRevenue: 140,
      templateKey: "rainy_day",
      offer: {
        headline: "Rainy day: free side",
        description: "Free side with any main when it rains.",
        discountType: "bogo",
        discountLabel: "Free side",
        daypart: "all_day",
        conditions: "Valid on rainy days this week · One per table",
        validFrom,
        validTo: daysFromNow(4).toISOString(),
        templateKey: "rainy_day",
      },
    });
  }

  // Always have at least one quiet-period idea.
  if (out.length === 0) {
    out.push({
      title: "Quiet evening boost · 5–7pm",
      reason: `Early evenings are often soft for ${cuisine} spots in ${city}. A short, clear offer fills empty covers before the late rush.`,
      confidence: 72,
      impactScore: 70,
      estimatedExtraCustomers: 11,
      estimatedExtraRevenue: 160,
      templateKey: "quiet_evening",
      offer: {
        headline: "Early bird: free soft drink",
        description: `Free soft drink with any main 5–7pm at ${name}.`,
        discountType: "bogo",
        discountLabel: "Free soft drink",
        daypart: "dinner",
        conditions: "Tonight · 5–7pm · Dine-in",
        validFrom,
        validTo: daysFromNow(2).toISOString(),
        templateKey: "quiet_evening",
      },
    });
  }

  return out.sort((a, b) => b.impactScore - a.impactScore).slice(0, MAX_PENDING_DEMAND_RECS);
}

/** Simple weather proxy until a real weather API is wired — treat UK-ish rainy seasons as hint. */
function rainyHintForNow(): boolean {
  const month = new Date().getMonth(); // 0-11
  return month >= 9 || month <= 2; // Oct–Mar
}

/**
 * Top up PENDING recommendations to at most 3. Skips templateKeys already pending.
 * Returns how many new rows were created.
 */
export async function generateDailyRecommendationsForRestaurant(restaurantId: string): Promise<{
  created: number;
  pending: number;
}> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { name: true, cuisineType: true, city: true },
  });
  if (!restaurant) return { created: 0, pending: 0 };

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

  const usedKeys = new Set(existing.map((e) => e.templateKey).filter(Boolean));
  const candidates = buildCandidates({
    name: restaurant.name,
    cuisine: restaurant.cuisineType?.trim() || "restaurant",
    city: restaurant.city?.trim() || "your area",
    weekday: new Date().getDay(),
    rainyHint: rainyHintForNow(),
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
      confidence: d.confidence,
      impactScore: d.impactScore,
      estimatedExtraCustomers: d.estimatedExtraCustomers,
      estimatedExtraRevenue: d.estimatedExtraRevenue,
      templateKey: d.templateKey,
      offer: d.offer,
      expiresAt: daysFromNow(7),
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
