import { ContentType, SubscriptionPlan } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { planMeetsMinimum } from "@/lib/billing/plan-access";
import { getRestaurantForMember } from "@/lib/billing/restaurant-member";
import { jsonUpgradeRequired } from "@/lib/billing/upgrade-response";
import { generateWebsiteRedesign } from "@/lib/growth-agent/generate-website-redesign";
import { persistGrowthGeneration } from "@/lib/growth-agent/persist-generated-growth";

const bodySchema = z.object({
  restaurantId: z.string().min(12),
});

function statusFromError(e: string) {
  if (e.includes("OPENAI") || e.includes("not configured") || e.includes("API key") || e.includes("Empty model")) {
    return 503;
  }
  if (e.includes("website URL")) {
    return 400;
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
  if (!planMeetsMinimum(restaurant.subscriptionPlan, SubscriptionPlan.STARTER)) {
    return jsonUpgradeRequired(SubscriptionPlan.STARTER, restaurant.subscriptionPlan);
  }

  const result = await generateWebsiteRedesign(parsed.data.restaurantId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: statusFromError(result.error) });
  }

  try {
    await persistGrowthGeneration({
      restaurantId: parsed.data.restaurantId,
      type: ContentType.GROWTH_WEBSITE_PLAN,
      prompt: `website-redesign restaurant=${parsed.data.restaurantId}`,
      payload: result.data,
    });
  } catch (e) {
    console.error("persistGrowthGeneration website-redesign", e);
  }

  return NextResponse.json({ ok: true, sections: result.data.sections });
}
