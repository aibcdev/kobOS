import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { ensureAppUser } from "@/lib/auth/ensure-user";
import {
  AUTH_NEXT_COOKIE,
  safeNextPath,
} from "@/lib/auth/auth-next-cookie";
import { ensureSalesWorkspaceMembership } from "@/lib/outbound/ensure-sales-membership";

export const runtime = "nodejs";

function loginErrorRedirect(
  origin: string,
  code: string,
  detail?: string,
): NextResponse {
  const url = new URL(`${origin}/login`);
  url.searchParams.set("error", code);
  if (detail) url.searchParams.set("detail", detail);
  return NextResponse.redirect(url.toString());
}

/** Magic-link landing (token_hash) — server verify, no PKCE. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type") as EmailOtpType | null;
  const token = searchParams.get("token");
  const email = searchParams.get("email")?.trim();
  const authError = searchParams.get("error_description") ?? searchParams.get("error");

  if (authError) {
    return loginErrorRedirect(origin, "exchange", authError);
  }

  if (!tokenHash && !(token && otpType)) {
    return loginErrorRedirect(origin, "missing_code");
  }

  if (!tokenHash && token && otpType && !email) {
    return loginErrorRedirect(origin, "missing_email");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnon) {
    return loginErrorRedirect(origin, "missing_env");
  }

  const nextCookie = request.cookies.get(AUTH_NEXT_COOKIE)?.value;
  const next = safeNextPath(
    searchParams.get("next") ?? (nextCookie ? decodeURIComponent(nextCookie) : null),
  );
  const redirectTo = `${origin}${next}`;
  const response = NextResponse.redirect(redirectTo);
  response.cookies.delete(AUTH_NEXT_COOKIE);

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const verify =
    tokenHash && otpType
      ? await supabase.auth.verifyOtp({ type: otpType, token_hash: tokenHash })
      : await supabase.auth.verifyOtp({
          type: otpType!,
          token: token!,
          email: email!,
        });

  if (verify.error || !verify.data.user) {
    return loginErrorRedirect(
      origin,
      "exchange",
      verify.error?.message ?? "no_user",
    );
  }

  try {
    await ensureAppUser(verify.data.user);
    await ensureSalesWorkspaceMembership(verify.data.user.id);
  } catch {
    return loginErrorRedirect(origin, "profile");
  }

  return response;
}
