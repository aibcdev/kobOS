import { NextResponse } from "next/server";
import {
  countryFromHeaders,
  foundingPrice,
  regionFromRequestHeaders,
} from "@/lib/billing/regional-pricing";

export const dynamic = "force-dynamic";

/** Which founding price this visitor gets, and why. No PII beyond country code. */
export async function GET(req: Request) {
  const region = regionFromRequestHeaders(req.headers);
  return NextResponse.json({
    country: countryFromHeaders(req.headers),
    region,
    price: foundingPrice(region).label,
  });
}
