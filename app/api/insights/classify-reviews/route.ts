import { NextResponse } from "next/server";
import { z } from "zod";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import { requireApiUser } from "@/lib/auth/api-session";
import { classifyReviewsForRestaurant } from "@/lib/insights/classify-reviews";
import { getPreviewCustomerVoice } from "@/lib/preview/insights-preview";
import { isPreviewRestaurantId } from "@/lib/preview/ui-preview";

const bodySchema = z.object({ restaurantId: z.string().min(12) });

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
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  if (isPreviewRestaurantId(parsed.data.restaurantId)) {
    // Preview reviews arrive pre-tagged, so report them as already classified.
    const { reviews } = getPreviewCustomerVoice();
    return NextResponse.json({ classified: reviews.length, skipped: 0, preview: true });
  }

  const allowed = await assertRestaurantMembership(session.userId, parsed.data.restaurantId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await classifyReviewsForRestaurant(parsed.data.restaurantId);
  return NextResponse.json(result);
}
