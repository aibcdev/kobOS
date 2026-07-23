import { NextResponse } from "next/server";
import { assertOpsStatusAccess } from "@/lib/ops/assert-ops-status-access";

/** Safe auth/email config check — never exposes secrets. Ops-gated in production. */
export async function GET(req: Request) {
  const denied = assertOpsStatusAccess(req);
  if (denied) return denied;

  const resend = process.env.RESEND_API_KEY?.trim() ?? "";
  const from =
    process.env.RESEND_AUTH_FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "";
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";

  return NextResponse.json({
    ok: Boolean(resend && serviceRole && supabaseUrl && from.includes("@")),
    hasResendKey: Boolean(resend),
    hasServiceRole: Boolean(serviceRole),
    hasSupabaseUrl: Boolean(supabaseUrl),
    fromAddress: from || null,
    fromUsesTrykob: from.includes("trykob.com"),
    appUrl: appUrl || null,
    appUrlIsProduction: appUrl.includes("trykob.com"),
  });
}
