import { NextResponse } from "next/server";
import { z } from "zod";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import { requireApiUser } from "@/lib/auth/api-session";
import { addManualReviews, MAX_PER_PASTE, parseReviews, type ManualReview } from "@/lib/reviews/manual";
import { isSameOrigin } from "@/lib/security/same-origin";
import { limit, tooManyRequests } from "@/lib/security/rate-limit";

const one = z.object({
  body: z.string().trim().max(4000).default(""),
  rating: z.coerce.number().int().min(0).max(5).default(0),
  reviewer: z.string().trim().max(80).nullable().optional(),
  url: z.string().trim().url().max(2000).nullable().optional(),
});
const input = z.object({
  restaurantId: z.string().min(1).max(64),
  /** Several reviews pasted at once; KOB splits them. */
  paste: z.string().max(60_000).optional(),
  reviews: z.array(one).max(MAX_PER_PASTE).optional(),
});

/** Add reviews by hand (until KOB can read them from Google); each new one gets a drafted reply for approval. */
export async function POST(req: Request) {
  const session = await requireApiUser();
  if (!session.ok) return NextResponse.json({ error: session.message }, { status: session.status });
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request refused" }, { status: 403 });
  const parsed = input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Paste at least one review." }, { status: 422 });
  const { restaurantId, paste, reviews } = parsed.data;
  if (!(await assertRestaurantMembership(session.userId, restaurantId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const rl = await limit(`reviews-manual:${session.userId}`, { windowSec: 3600, max: 30 });
  if (!rl.ok) return tooManyRequests(rl);

  const items: ManualReview[] = [
    ...(paste ? parseReviews(paste) : []),
    ...(reviews ?? [])
      .filter((r) => r.body || r.rating)
      .map((r) => ({ body: r.body, rating: r.rating, reviewer: r.reviewer?.trim() || null, url: r.url || null })),
  ];
  if (!items.length) return NextResponse.json({ error: "KOB couldn't find a review in that. Paste the review text." }, { status: 422 });
  const added = await addManualReviews(restaurantId, items, session.userId);
  return NextResponse.json({
    added: added.filter((a) => !a.duplicate).length,
    duplicates: added.filter((a) => a.duplicate).length,
    drafts: added.filter((a) => a.draft?.actionId).map((a) => ({ actionId: a.draft!.actionId, reviewer: a.review.reviewerName, rating: a.review.rating })),
  });
}
