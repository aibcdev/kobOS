import { SubscriptionPlan } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { planMeetsMinimum } from "@/lib/billing/plan-access";
import { getRestaurantForMember } from "@/lib/billing/restaurant-member";
import { jsonUpgradeRequired } from "@/lib/billing/upgrade-response";
import { prisma } from "@/lib/db/prisma";

const bodySchema = z.object({
  restaurantId: z.string().min(12),
});

function scoresFromKeyword(keyword: string) {
  let sum = 0;
  for (let i = 0; i < keyword.length; i++) sum += keyword.charCodeAt(i);
  const ranking = 3 + (sum % 48);
  const opportunityScore = 25 + (sum % 72);
  const searchVolume = 120 + (sum % 8800);
  return { ranking, opportunityScore, searchVolume };
}

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

  const restaurant = await getRestaurantForMember(session.userId, parsed.data.restaurantId);
  if (!restaurant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!planMeetsMinimum(restaurant.subscriptionPlan, SubscriptionPlan.STARTER)) {
    return jsonUpgradeRequired(SubscriptionPlan.STARTER, restaurant.subscriptionPlan);
  }

  const keywords = await prisma.keyword.findMany({
    where: { restaurantId: restaurant.id },
  });

  if (!keywords.length) {
    return NextResponse.json({ ok: true, updated: 0 });
  }

  await prisma.$transaction(
    keywords.map((k) => {
      const s = scoresFromKeyword(k.keyword);
      return prisma.keyword.update({
        where: { id: k.id },
        data: {
          ranking: s.ranking,
          opportunityScore: s.opportunityScore,
          searchVolume: s.searchVolume,
        },
      });
    }),
  );

  return NextResponse.json({ ok: true, updated: keywords.length });
}
