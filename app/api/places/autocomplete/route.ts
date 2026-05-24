import { NextResponse } from "next/server";
import { clientIpFromHeaders } from "@/lib/audit/rate-limit";
import { placesAutocompleteNew } from "@/lib/places/google-places-server";
import { checkPlacesRateLimit } from "@/lib/places/rate-limit";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const rl = checkPlacesRateLimit(clientIpFromHeaders(req.headers));
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Try again later.", retryAfterSec: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) {
    return NextResponse.json({ suggestions: [], hint: "Type at least 3 characters." });
  }

  if (!process.env.GOOGLE_PLACES_API_KEY?.trim()) {
    return NextResponse.json({
      suggestions: [],
      disabled: true,
      hint: "Places search is not configured (set GOOGLE_PLACES_API_KEY).",
    });
  }

  const suggestions = await placesAutocompleteNew(q);
  return NextResponse.json({ suggestions });
}
