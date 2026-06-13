import { OutboundLeadSource, OutboundLeadStatus, SubscriptionPlan } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { getRestaurantForMember } from "@/lib/billing/restaurant-member";
import { jsonUpgradeRequired } from "@/lib/billing/upgrade-response";
import { canUseOutboundWorkspace } from "@/lib/outbound/sales-access";
import { prisma } from "@/lib/db/prisma";

const bodySchema = z.object({
  restaurantId: z.string().min(12),
  /** Approve all pending in this source track */
  source: z.enum(["UK_COLD", "AUDIT", "LEAD_ENGINE", "ALL"]).optional(),
  leadIds: z.array(z.string().min(12)).max(50).optional(),
});

export const runtime = "nodejs";

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

  const sourceFilter = parsed.data.source ?? "ALL";
  const sourceWhere =
    sourceFilter === "ALL"
      ? {}
      : sourceFilter === "UK_COLD"
        ? { source: { in: [OutboundLeadSource.UK_COLD, OutboundLeadSource.LEAD_ENGINE] } }
        : sourceFilter === "LEAD_ENGINE"
          ? { source: OutboundLeadSource.LEAD_ENGINE }
          : { source: OutboundLeadSource.AUDIT };

  const rows = parsed.data.leadIds?.length
    ? await prisma.outboundLead.findMany({
        where: {
          id: { in: parsed.data.leadIds },
          workspaceRestaurantId: restaurant.id,
          status: { in: [OutboundLeadStatus.DRAFT, OutboundLeadStatus.PENDING_APPROVAL] },
        },
      })
    : await prisma.outboundLead.findMany({
        where: {
          workspaceRestaurantId: restaurant.id,
          status: { in: [OutboundLeadStatus.DRAFT, OutboundLeadStatus.PENDING_APPROVAL] },
          ...sourceWhere,
        },
        take: 50,
      });

  let approved = 0;
  let skipped = 0;

  for (const row of rows) {
    const email = row.contactEmail?.trim();
    if (!email) {
      skipped++;
      continue;
    }
    await prisma.outboundLead.update({
      where: { id: row.id },
      data: { status: OutboundLeadStatus.APPROVED, contactEmail: email },
    });
    approved++;
  }

  return NextResponse.json({ ok: true, approved, skipped, total: rows.length });
}
