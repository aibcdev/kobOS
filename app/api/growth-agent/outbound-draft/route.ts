import { SubscriptionPlan } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { planMeetsMinimum } from "@/lib/billing/plan-access";
import { getRestaurantForMember } from "@/lib/billing/restaurant-member";
import { jsonUpgradeRequired } from "@/lib/billing/upgrade-response";
import { generateOutboundDraft } from "@/lib/growth-agent/generate-outbound-draft";
import { persistOutboundDraftLeads } from "@/lib/growth-agent/persist-outbound-leads";

const bodySchema = z.object({
  restaurantId: z.string().min(12),
  city: z.string().min(1).max(120),
  max: z.number().int().min(1).max(20).optional(),
});

function statusFromError(e: string) {
  if (e.includes("OPENAI") || e.includes("not configured") || e.includes("API key") || e.includes("Empty model")) {
    return 503;
  }
  return 400;
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
  if (!planMeetsMinimum(restaurant.subscriptionPlan, SubscriptionPlan.PRO)) {
    return jsonUpgradeRequired(SubscriptionPlan.PRO, restaurant.subscriptionPlan);
  }

  const result = await generateOutboundDraft({
    city: parsed.data.city,
    max: parsed.data.max,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: statusFromError(result.error) });
  }

  const city = parsed.data.city.trim();
  const created = await persistOutboundDraftLeads(restaurant.id, city, result.data.leads);

  return NextResponse.json({
    ok: true,
    inserted: created.length,
    ids: created.map((r) => r.id),
  });
}
