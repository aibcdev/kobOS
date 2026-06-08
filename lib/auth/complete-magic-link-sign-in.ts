import type { EmailOtpType, SupabaseClient } from "@supabase/supabase-js";
import {
  createMagicLinkAuthClient,
  syncAuthSessionToCookies,
} from "@/lib/supabase/magic-link-auth";

export type MagicLinkCallbackParams = {
  code: string | null;
  tokenHash: string | null;
  otpType: EmailOtpType | null;
  token: string | null;
  email: string | null;
};

export async function completeMagicLinkSignIn(
  cookieClient: SupabaseClient,
  params: MagicLinkCallbackParams,
): Promise<void> {
  const { code, tokenHash, otpType, token, email } = params;

  if (tokenHash && otpType) {
    const { error } = await cookieClient.auth.verifyOtp({
      type: otpType,
      token_hash: tokenHash,
    });
    if (error) throw error;
    return;
  }

  if (token && otpType) {
    if (!email?.trim()) throw new Error("missing_email");
    const { error } = await cookieClient.auth.verifyOtp({
      type: otpType,
      token,
      email: email.trim(),
    });
    if (error) throw error;
    return;
  }

  if (code) {
    const pkceClient = createMagicLinkAuthClient();
    const { error } = await pkceClient.auth.exchangeCodeForSession(code);
    if (error) throw error;
    await syncAuthSessionToCookies();
    return;
  }

  throw new Error("missing_auth_params");
}
