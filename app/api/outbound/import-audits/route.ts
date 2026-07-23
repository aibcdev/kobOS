import { SubscriptionPlan } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { getRestaurantForMember } from "@/lib/billing/restaurant-member";
import { jsonUpgradeRequired } from "@/lib/billing/upgrade-response";
import { importAuditLeadsToOutbound } from "@/lib/outbound/import-audit-leads";
import {
  canUseOutboundWorkspace,
  isOutboundSalesWorkspace,
} from "@/lib/outbound/sales-access";

const bodySchema = z.object({
  restaurantId: z.string().min(12),
  max: z.number().int().min(1).max(50).optional(),
  daysBack: z.number().int().min(1).max(90).optional(),
});

export const runtime = "nodejs";

/** Import unlocked audit emails into the outbound approval queue (sales workspace only). */
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
  if (!canUseOutboundWorkspace(restaurant.subscriptionPlan)) {
    return jsonUpgradeRequired(SubscriptionPlan.PRO, restaurant.subscriptionPlan);
  }
  if (!isOutboundSalesWorkspace(restaurant.id)) {
    return NextResponse.json(
      { error: "Audit lead import is limited to the KOB sales workspace." },
      { status: 403 },
    );
  }

  const result = await importAuditLeadsToOutbound(restaurant.id, {
    max: parsed.data.max,
    daysBack: parsed.data.daysBack,
  });

  return NextResponse.json({ ok: true, ...result });
}
