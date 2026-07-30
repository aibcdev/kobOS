import { NextResponse } from "next/server";

/**
 * Rank refresh is disabled until a real SERP source is connected.
 *
 * This used to derive ranking, opportunity score, and search volume from a hash of
 * the keyword string and save them as if they were measured. Blank beats invented.
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "Live rank tracking isn't connected yet, so there's nothing to refresh.",
    },
    { status: 501 },
  );
}
