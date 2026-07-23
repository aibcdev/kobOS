import { NextResponse } from "next/server";
import { sendLoginEmailViaResend } from "@/lib/auth/send-login-email";
import {
  checkSimpleRateLimit,
  clientIpFromHeaders,
} from "@/lib/security/simple-rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = clientIpFromHeaders(request.headers) ?? "unknown";
  const rlIp = checkSimpleRateLimit(`magic-link:ip:${ip}`, {
    windowMs: 60 * 60 * 1000,
    max: 10,
  });
  if (!rlIp.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSec: rlIp.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rlIp.retryAfterSec) } },
    );
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const email = body.email?.trim();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const rlEmail = checkSimpleRateLimit(`magic-link:email:${email.toLowerCase()}`, {
    windowMs: 60 * 60 * 1000,
    max: 5,
  });
  if (!rlEmail.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSec: rlEmail.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rlEmail.retryAfterSec) } },
    );
  }

  const result = await sendLoginEmailViaResend(email);
  if (!result.ok) {
    const status = result.reason === "missing_service_role" ? 503 : 502;
    return NextResponse.json(
      { error: result.reason, hint: result.hint },
      { status },
    );
  }

  return NextResponse.json({ ok: true, via: result.via });
}
