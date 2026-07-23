import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { getRestaurantForMember } from "@/lib/billing/restaurant-member";
import { inngest } from "@/inngest/client";
import {
  canUseOutboundWorkspace,
  isOutboundSalesWorkspace,
} from "@/lib/outbound/sales-access";
import { isUkColdOutboundMode } from "@/lib/outbound/icp-config";

const bodySchema = z.object({
  restaurantId: z.string().min(12),
  /** draft | send | both */
  step: z.enum(["draft", "send", "both"]).optional(),
});

export const runtime = "nodejs";

/** Manually enqueue daily outbound jobs (same as cron + Inngest). Scoped to caller's restaurant. */
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
  if (!restaurant || !canUseOutboundWorkspace(restaurant.subscriptionPlan)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  /** Platform-wide finder/UK cold only from the sales workspace. */
  const salesWorkspace = isOutboundSalesWorkspace(restaurant.id);
  const step = parsed.data.step ?? "both";
  const events: { name: string; data: Record<string, string> }[] = [];

  if (step === "draft" || step === "both") {
    if (salesWorkspace) {
      events.push({
        name: "lead-engine/finder.requested",
        data: { source: "dashboard", restaurantId: restaurant.id },
      });
      events.push({
        name: "lead-engine/analyzer.requested",
        data: { source: "dashboard", restaurantId: restaurant.id },
      });
      events.push({
        name: "lead-engine/outreach-writer.requested",
        data: { source: "dashboard", restaurantId: restaurant.id },
      });
      if (isUkColdOutboundMode()) {
        events.push({
          name: "outbound/uk-cold.requested",
          data: { source: "dashboard", restaurantId: restaurant.id },
        });
        events.push({
          name: "outbound/audit-import.requested",
          data: { source: "dashboard", restaurantId: restaurant.id },
        });
      } else {
        events.push({
          name: "outbound/daily.requested",
          data: { source: "dashboard", restaurantId: restaurant.id },
        });
      }
    } else {
      events.push({
        name: "outbound/daily.requested",
        data: { source: "dashboard", restaurantId: restaurant.id },
      });
    }
  }
  if (step === "send" || step === "both") {
    events.push({
      name: "outbound/send.requested",
      data: { source: "dashboard", restaurantId: restaurant.id },
    });
  }

  await inngest.send(events);

  return NextResponse.json({ ok: true, enqueued: events.map((e) => e.name) });
}
