import { ServiceRequestType, SubscriptionPlan } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { planMeetsMinimum } from "@/lib/billing/plan-access";
import { getRestaurantForMember } from "@/lib/billing/restaurant-member";
import { jsonUpgradeRequired } from "@/lib/billing/upgrade-response";
import { ensureMonthlyCredits } from "@/lib/credits/balance";
import {
  catalogItem,
  includedWithPlan,
  monthlyIncludedLimit,
  SERVICE_CATALOG,
} from "@/lib/credits/catalog";
import { prisma } from "@/lib/db/prisma";
import { notifyOpsAboutServiceRequest } from "@/lib/ops/notify-service-request";
import { isPreviewRestaurantId } from "@/lib/preview/ui-preview";

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

  if (isPreviewRestaurantId(restaurantId)) {
    const { creditBalance } = await ensureMonthlyCredits(restaurantId);
    return NextResponse.json({ creditBalance, catalog: SERVICE_CATALOG, requests: [] });
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

  if (parsed.data.type === ServiceRequestType.AUDIT_FIX || parsed.data.type === ServiceRequestType.OTHER) {
    return NextResponse.json({ error: "Unknown service type" }, { status: 422 });
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

  // Preview mode has no database — acknowledge the request so the flow can be reviewed.
  if (isPreviewRestaurantId(parsed.data.restaurantId)) {
    return NextResponse.json(
      {
        ok: true,
        preview: true,
        request: {
          id: `preview-request-${parsed.data.type}`,
          type: parsed.data.type,
          status: "REQUESTED",
          title: item.title,
          notes: parsed.data.notes?.trim() || "",
          creditCost: item.creditCost,
          createdAt: new Date().toISOString(),
        },
        notified: false,
        creditBalance: 40 - item.creditCost,
        message: "Requested — in preview mode nothing is sent to the team.",
      },
      { status: 201 },
    );
  }

  const { creditBalance } = await ensureMonthlyCredits(parsed.data.restaurantId);

  const openSame = await prisma.serviceRequest.findFirst({
    where: {
      restaurantId: parsed.data.restaurantId,
      type: parsed.data.type,
      status: { in: ["REQUESTED", "IN_PROGRESS", "DRAFTS_READY"] },
    },
    select: { id: true, status: true },
  });
  if (openSame) {
    return NextResponse.json(
      {
        error: "You already have an open request for this service.",
        requestId: openSame.id,
        request: openSame,
      },
      { status: 409 },
    );
  }

  const included = includedWithPlan(parsed.data.type, restaurant.subscriptionPlan);
  const includedLimit = monthlyIncludedLimit(parsed.data.type, restaurant.subscriptionPlan);
  if (included && includedLimit != null) {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const usedThisMonth = await prisma.serviceRequest.count({
      where: {
        restaurantId: parsed.data.restaurantId,
        type: parsed.data.type,
        createdAt: { gte: monthStart },
        status: { not: "CANCELLED" },
      },
    });
    if (usedThisMonth >= includedLimit) {
      return NextResponse.json(
        {
          error: `Your included monthly limit for ${item.title.toLowerCase()} is ${includedLimit}.`,
          includedLimit,
        },
        { status: 429 },
      );
    }
  }
  const reservedTotal = included
    ? 0
    : (
        await prisma.serviceRequest.aggregate({
        where: {
          restaurantId: parsed.data.restaurantId,
          chargedAt: null,
          status: { in: ["REQUESTED", "IN_PROGRESS", "DRAFTS_READY"] },
        },
        _sum: { reservedCredits: true },
        })
      )._sum.reservedCredits ?? 0;
  const reservedCredits = included ? 0 : item.creditCost;
  const available = creditBalance - reservedTotal;
  if (!included && available < reservedCredits) {
    return NextResponse.json(
      { error: "Not enough available credits", creditBalance, available, needed: reservedCredits },
      { status: 402 },
    );
  }

  const created = await prisma.serviceRequest.create({
    data: {
      restaurantId: parsed.data.restaurantId,
      type: parsed.data.type,
      title: item.title,
      notes: parsed.data.notes?.trim() || "",
      creditCost: item.creditCost,
      reservedCredits,
      status: "REQUESTED",
    },
  });

  const owner = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });

  const notified = await notifyOpsAboutServiceRequest(created.id, {
    requestedByEmail: owner?.email ?? null,
    source: "Service catalog",
  });

  return NextResponse.json(
    {
      ok: true,
      request: created,
      notified: notified.ok,
      creditBalance,
      reservedCredits,
      message: "Requested. We will create three drafts. Credits are only charged after you approve one.",
    },
    { status: 201 },
  );
}
