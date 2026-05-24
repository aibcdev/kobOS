import { SubscriptionPlan } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { getRestaurantForMember } from "@/lib/billing/restaurant-member";
import { jsonUpgradeRequired } from "@/lib/billing/upgrade-response";
import { prisma } from "@/lib/db/prisma";

const bodySchema = z.object({
  restaurantId: z.string().min(12),
  keyword: z.string().min(2).max(120),
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

  const restaurant = await getRestaurantForMember(session.userId, parsed.data.restaurantId);
  if (!restaurant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const kw = parsed.data.keyword.trim();
  if (kw.length < 2) {
    return NextResponse.json({ error: "Keyword too short" }, { status: 400 });
  }

  if (restaurant.subscriptionPlan === SubscriptionPlan.FREE) {
    const count = await prisma.keyword.count({ where: { restaurantId: restaurant.id } });
    if (count >= 3) {
      return jsonUpgradeRequired(SubscriptionPlan.STARTER, restaurant.subscriptionPlan);
    }
  }

  const row = await prisma.keyword.create({
    data: {
      restaurantId: restaurant.id,
      keyword: kw,
      opportunityScore: 40 + (kw.length % 35),
    },
  });

  return NextResponse.json({ ok: true, id: row.id });
}
