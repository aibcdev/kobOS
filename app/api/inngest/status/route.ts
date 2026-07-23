import { NextResponse } from "next/server";
import { assertOpsStatusAccess } from "@/lib/ops/assert-ops-status-access";

/** Safe health check — never exposes full secrets. Ops-gated in production. */
export async function GET(req: Request) {
  const denied = assertOpsStatusAccess(req);
  if (denied) return denied;

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
