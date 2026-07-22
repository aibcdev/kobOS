import { CreativePackStatus, SubscriptionPlan } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { planMeetsMinimum } from "@/lib/billing/plan-access";
import { getRestaurantForMember } from "@/lib/billing/restaurant-member";
import { jsonUpgradeRequired } from "@/lib/billing/upgrade-response";
import {
  countCreativePacksThisMonth,
  runCreativePack,
} from "@/lib/creative-agent/run-creative-pack";
import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/db/prisma";

export const maxDuration = 300;

const bodySchema = z.object({
  restaurantId: z.string().min(12),
  dishHints: z.array(z.string().min(1).max(80)).max(8).optional(),
  /** When true, queue Inngest instead of running inline (default for full packs). */
  async: z.boolean().optional(),
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

  const isFree = restaurant.subscriptionPlan === SubscriptionPlan.FREE;
  if (!isFree && !planMeetsMinimum(restaurant.subscriptionPlan, SubscriptionPlan.STARTER)) {
    return jsonUpgradeRequired(SubscriptionPlan.STARTER, restaurant.subscriptionPlan);
  }

  const packsThisMonth = await countCreativePacksThisMonth(parsed.data.restaurantId);
  if (isFree && packsThisMonth >= 1) {
    return jsonUpgradeRequired(SubscriptionPlan.STARTER, restaurant.subscriptionPlan);
  }

  const running = await prisma.creativePack.findFirst({
    where: {
      restaurantId: parsed.data.restaurantId,
      status: { in: [CreativePackStatus.PENDING, CreativePackStatus.RUNNING] },
    },
    select: { id: true },
  });
  if (running) {
    return NextResponse.json(
      { ok: true, packId: running.id, status: "RUNNING", message: "A pack is already generating." },
      { status: 202 },
    );
  }

  const targetCount = isFree
    ? Math.min(3, Number(process.env.CREATIVE_PACK_PREVIEW_SIZE?.trim() || "3") || 3)
    : Math.min(16, Math.max(4, Number(process.env.CREATIVE_PACK_SIZE?.trim() || "12") || 12));

  const pack = await prisma.creativePack.create({
    data: {
      restaurantId: parsed.data.restaurantId,
      status: CreativePackStatus.PENDING,
      targetCount,
    },
  });

  const preferAsync = parsed.data.async !== false && !isFree;

  if (preferAsync) {
    try {
      await inngest.send({
        name: "creative-agent/pack.requested",
        data: {
          packId: pack.id,
          restaurantId: parsed.data.restaurantId,
          preview: isFree,
          dishHints: parsed.data.dishHints ?? [],
        },
      });
      return NextResponse.json(
        { ok: true, packId: pack.id, status: "PENDING", async: true },
        { status: 202 },
      );
    } catch (e) {
      console.warn("[creative-agent] Inngest send failed; running inline", e);
    }
  }

  const result = await runCreativePack(parsed.data.restaurantId, {
    packId: pack.id,
    preview: isFree,
    dishHints: parsed.data.dishHints,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, packId: result.packId ?? pack.id },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    packId: result.packId,
    status: result.status,
    doneCount: result.doneCount,
    async: false,
  });
}
