import { NextResponse } from "next/server";
import { sendLoginEmailViaResend } from "@/lib/auth/send-login-email";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
