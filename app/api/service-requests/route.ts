import { ServiceRequestType, SubscriptionPlan } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { planMeetsMinimum } from "@/lib/billing/plan-access";
import { getRestaurantForMember } from "@/lib/billing/restaurant-member";
import { jsonUpgradeRequired } from "@/lib/billing/upgrade-response";
import { ensureMonthlyCredits, spendCredits } from "@/lib/credits/balance";
import { catalogItem, SERVICE_CATALOG } from "@/lib/credits/catalog";
import { prisma } from "@/lib/db/prisma";

const bodySchema = z.object({
  restaurantId: z.string().min(12),
  type: z.nativeEnum(ServiceRequestType),
  notes: z.string().max(2000).optional(),
});

export async function GET(req: Request) {
  const session = await requireApiUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const restaurantId = new URL(req.url).searchParams.get("restaurantId")?.trim();
  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId required" }, { status: 422 });
  }

  const restaurant = await getRestaurantForMember(session.userId, restaurantId);
  if (!restaurant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { creditBalance } = await ensureMonthlyCredits(restaurantId);
  const requests = await prisma.serviceRequest.findMany({
    where: { restaurantId },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return NextResponse.json({
    creditBalance,
    catalog: SERVICE_CATALOG,
    requests,
  });
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
    return NextResponse.json({ error: "Invalid JSON" }, { status: 422 });
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

  const item = catalogItem(parsed.data.type);
  if (!item) {
    return NextResponse.json({ error: "Unknown service type" }, { status: 422 });
  }

  await ensureMonthlyCredits(parsed.data.restaurantId);

  const openSame = await prisma.serviceRequest.findFirst({
    where: {
      restaurantId: parsed.data.restaurantId,
      type: parsed.data.type,
      status: { in: ["REQUESTED", "IN_PROGRESS"] },
    },
    select: { id: true },
  });
  if (openSame) {
    return NextResponse.json(
      { error: "You already have an open request for this service.", requestId: openSame.id },
      { status: 409 },
    );
  }

  const created = await prisma.serviceRequest.create({
    data: {
      restaurantId: parsed.data.restaurantId,
      type: parsed.data.type,
      title: item.title,
      notes: parsed.data.notes?.trim() || "",
      creditCost: item.creditCost,
    },
  });

  const spent = await spendCredits({
    restaurantId: parsed.data.restaurantId,
    amount: item.creditCost,
    note: `Request: ${item.title}`,
    requestId: created.id,
  });

  if (!spent.ok) {
    await prisma.serviceRequest.delete({ where: { id: created.id } });
    return NextResponse.json(
      { error: spent.error, creditBalance: spent.balance, needed: item.creditCost },
      { status: 402 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      request: created,
      creditBalance: spent.balanceAfter,
      message: "Request received. Our team will deliver this manually — we'll update you when it's ready.",
    },
    { status: 201 },
  );
}
