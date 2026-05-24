import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIpFromHeaders } from "@/lib/audit/rate-limit";
import { placesPlaceDetailsNew } from "@/lib/places/google-places-server";
import { checkPlacesRateLimit } from "@/lib/places/rate-limit";

export const runtime = "nodejs";

const querySchema = z.object({
  placeId: z.string().trim().min(3).max(256),
});

export async function GET(req: Request) {
  const rl = checkPlacesRateLimit(clientIpFromHeaders(req.headers));
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Try again later.", retryAfterSec: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({ placeId: searchParams.get("placeId") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid placeId" }, { status: 400 });
  }

  if (!process.env.GOOGLE_PLACES_API_KEY?.trim()) {
    return NextResponse.json(
      { error: "Places is not configured", disabled: true },
      { status: 503 },
    );
  }

  const details = await placesPlaceDetailsNew(parsed.data.placeId);
  if (!details) {
    return NextResponse.json({ error: "Place not found" }, { status: 404 });
  }

  return NextResponse.json(details);
}
