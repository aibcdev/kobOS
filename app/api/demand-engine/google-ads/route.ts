import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/auth/api-session";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import {
  createB2bAuditGoogleAdsCampaign,
  createLocalGoogleAdsCampaign,
  listLocalGoogleAdsCampaigns,
} from "@/lib/demand-engine/actions";

const createSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("b2b_audit").default("b2b_audit"),
    restaurantId: z.string().min(12),
    dailyBudgetGbp: z.number().min(10).max(500).optional(),
    locations: z.array(z.string().min(2).max(80)).min(1).max(20).optional(),
  }),
  z.object({
    mode: z.literal("local_diner"),
    restaurantId: z.string().min(12),
    area: z.string().min(2).max(120),
    radiusKm: z.number().min(1).max(40).optional(),
    dailyBudgetGbp: z.number().min(5).max(500).optional(),
    goal: z.enum(["covers", "takeaway", "brand"]).optional(),
    promoHeadline: z.string().max(30).optional(),
  }),
]);

export async function GET(req: Request) {
  const session = await requireApiUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const restaurantId = new URL(req.url).searchParams.get("restaurantId") ?? "";
  if (restaurantId.length < 12) {
    return NextResponse.json({ error: "restaurantId required" }, { status: 422 });
  }

  const allowed = await assertRestaurantMembership(session.userId, restaurantId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const campaigns = await listLocalGoogleAdsCampaigns(restaurantId);
  return NextResponse.json({
    campaigns: campaigns.map((c) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      createdAt: c.createdAt,
      payload: c.payload,
    })),
  });
}

export async function POST(req: Request) {
  const session = await requireApiUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const body = await req.json().catch(() => null);
  const normalized =
    body && typeof body === "object" && !("mode" in body)
      ? { ...body, mode: "b2b_audit" }
      : body;
  const parsed = createSchema.safeParse(normalized);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const allowed = await assertRestaurantMembership(session.userId, parsed.data.restaurantId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (parsed.data.mode === "local_diner") {
    const result = await createLocalGoogleAdsCampaign(parsed.data.restaurantId, {
      area: parsed.data.area,
      radiusKm: parsed.data.radiusKm,
      dailyBudgetGbp: parsed.data.dailyBudgetGbp,
      goal: parsed.data.goal,
      promoHeadline: parsed.data.promoHeadline,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      campaignId: result.campaign.id,
      liveOfferId: result.liveOffer.id,
      plan: result.plan,
    });
  }

  const result = await createB2bAuditGoogleAdsCampaign(parsed.data.restaurantId, {
    dailyBudgetGbp: parsed.data.dailyBudgetGbp,
    locations: parsed.data.locations,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    campaignId: result.campaign.id,
    liveOfferId: result.liveOffer.id,
    plan: result.plan,
  });
}
