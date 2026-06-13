import { NextResponse } from "next/server";

/** Safe health check — never exposes full secrets. */
export async function GET() {
  const signing = process.env.INNGEST_SIGNING_KEY?.trim() ?? "";
  const event = process.env.INNGEST_EVENT_KEY?.trim() ?? "";

  return NextResponse.json({
    ok: Boolean(signing),
    hasSigningKey: Boolean(signing),
    hasEventKey: Boolean(event),
    signingKeyPrefix: signing ? signing.slice(0, 16) : null,
    signingKeyLooksValid: /^signkey-(prod|test)-/i.test(signing),
    inngestDev: process.env.INNGEST_DEV ?? null,
    nodeEnv: process.env.NODE_ENV ?? null,
  });
}
