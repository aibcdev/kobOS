import { CreditLedgerReason, ServiceRequestStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { getRestaurantForMember } from "@/lib/billing/restaurant-member";
import { includedWithPlan } from "@/lib/credits/catalog";
import { prisma } from "@/lib/db/prisma";

const bodySchema = z.object({ draftId: z.string().min(12) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiUser();
  if (!session.ok) return NextResponse.json({ error: session.message }, { status: session.status });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "draftId required" }, { status: 422 });

  const { id } = await ctx.params;
  const request = await prisma.serviceRequest.findUnique({
    where: { id },
    include: { drafts: { where: { id: parsed.data.draftId } }, restaurant: true },
  });
  if (!request || request.drafts.length !== 1) {
    return NextResponse.json({ error: "Request or draft not found" }, { status: 404 });
  }
  if (!(await getRestaurantForMember(session.userId, request.restaurantId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (request.status === ServiceRequestStatus.APPROVED || request.chargedAt) {
    return NextResponse.json({ ok: true, duplicate: true, requestId: request.id });
  }
  if (request.status !== ServiceRequestStatus.DRAFTS_READY) {
    return NextResponse.json({ error: "Drafts are not ready for approval" }, { status: 409 });
  }

  const included = includedWithPlan(request.type, request.restaurant.subscriptionPlan);
  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const restaurant = await tx.restaurant.findUnique({
      where: { id: request.restaurantId },
      select: { creditBalance: true },
    });
    if (!restaurant) throw new Error("restaurant_not_found");
    const charge = included ? 0 : request.reservedCredits;
    if (restaurant.creditBalance < charge) return { ok: false as const, balance: restaurant.creditBalance };
    const balanceAfter = restaurant.creditBalance - charge;
    if (charge > 0) {
      await tx.restaurant.update({
        where: { id: request.restaurantId },
        data: { creditBalance: balanceAfter },
      });
      await tx.creditLedgerEntry.create({
        data: {
          restaurantId: request.restaurantId,
          delta: -charge,
          balanceAfter,
          reason: CreditLedgerReason.SERVICE_REQUEST,
          note: `Approved draft: ${request.title}`,
          requestId: request.id,
        },
      });
    }
    await tx.serviceRequestDraft.update({
      where: { id: parsed.data.draftId },
      data: { approvedAt: now },
    });
    await tx.serviceRequest.update({
      where: { id: request.id },
      data: {
        status: ServiceRequestStatus.APPROVED,
        approvedDraftId: parsed.data.draftId,
        chargedAt: now,
        reservedCredits: 0,
      },
    });
    return { ok: true as const, balanceAfter, charged: charge };
  });

  if (!result.ok) {
    return NextResponse.json({ error: "Not enough credits", creditBalance: result.balance }, { status: 402 });
  }
  return NextResponse.json(result);
}
