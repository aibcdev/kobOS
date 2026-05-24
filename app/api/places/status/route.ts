import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** No secrets — tells the UI which Google integrations are configured. */
export function GET() {
  return NextResponse.json({
    placesConfigured: Boolean(process.env.GOOGLE_PLACES_API_KEY?.trim()),
    mapsConfigured: Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()),
  });
}
