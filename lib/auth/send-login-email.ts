import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { getAuthOrigin } from "@/lib/auth/auth-origin";

export type SendLoginEmailResult =
  | { ok: true; via: "resend" }
  | { ok: false; reason: string; hint?: string };

/** Bypass broken Supabase SMTP — send magic link + OTP via Resend (needs service role). */
export async function sendLoginEmailViaResend(email: string): Promise<SendLoginEmailResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_AUTH_FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "KOB <onboarding@resend.dev>";

  if (!supabaseUrl || !serviceRole) {
    return {
      ok: false,
      reason: "missing_service_role",
      hint: "Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase → Settings → API).",
    };
  }
  if (!resendKey) {
    return {
      ok: false,
      reason: "missing_resend",
      hint: "Add RESEND_API_KEY to .env.local.",
    };
  }

  const origin = getAuthOrigin();
  const redirectTo = `${origin}/auth/confirm`;

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: email.trim(),
    options: { redirectTo },
  });

  if (error || !data?.properties) {
    return {
      ok: false,
      reason: error?.message ?? "generate_link_failed",
    };
  }

  const { hashed_token: tokenHash, email_otp: otp } = data.properties;
  if (!tokenHash || !otp) {
    return { ok: false, reason: "generate_link_missing_fields" };
  }

  const signInUrl = `${redirectTo}?token_hash=${encodeURIComponent(tokenHash)}&type=email`;
  const resend = new Resend(resendKey);
  const { error: sendError } = await resend.emails.send({
    from,
    to: [email.trim()],
    subject: "Your KOB sign-in code",
    html: `
      <p>Sign in to KOB:</p>
      <p><a href="${signInUrl}">Click here to sign in</a></p>
      <p>Or enter this code on the login page: <strong style="font-size:20px;letter-spacing:2px">${otp}</strong> (paste all digits)</p>
      <p style="color:#666;font-size:12px">This expires in about an hour. If you did not request this, ignore this email.</p>
    `,
  });

  if (sendError) {
    return { ok: false, reason: sendError.message };
  }

  return { ok: true, via: "resend" };
}
