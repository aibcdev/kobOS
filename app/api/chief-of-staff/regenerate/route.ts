import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { withTimeout } from "@/lib/auth/with-timeout";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import { getPreviewChiefOfStaffBrief } from "@/lib/preview/chief-of-staff-preview";
import { isPreviewRestaurantId } from "@/lib/preview/ui-preview";

const bodySchema = z.object({
  restaurantId: z.string().min(12),
});

/** Cap AI brief generation so the dashboard Refresh button never hangs forever. */
const REGENERATE_BUDGET_MS = 22_000;

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
    return NextResponse.json({ error: "restaurantId required" }, { status: 400 });
  }

  if (isPreviewRestaurantId(parsed.data.restaurantId)) {
    return NextResponse.json(getPreviewChiefOfStaffBrief());
  }

  const allowed = await assertRestaurantMembership(session.userId, parsed.data.restaurantId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { ensureTodayBrief } = await import("@/lib/chief-of-staff/ensure-today-brief");
  try {
    const payload = await withTimeout(
      ensureTodayBrief(parsed.data.restaurantId, true),
      REGENERATE_BUDGET_MS,
      "regenerate_timeout",
    );
    return NextResponse.json(payload);
  } catch (e) {
    console.error("[chief-of-staff/regenerate]", e);
    const timedOut = e instanceof Error && e.message === "regenerate_timeout";
    return NextResponse.json(
      { error: timedOut ? "Brief refresh timed out" : "Regenerate failed" },
      { status: timedOut ? 504 : 500 },
    );
  }
}
