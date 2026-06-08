import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/** PKCE verifier in localStorage — same client must send OTP and exchange code. */
let magicLinkClient: SupabaseClient | null = null;

export function createMagicLinkAuthClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("Magic link auth is browser-only");
  }
  if (!magicLinkClient) {
    magicLinkClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      {
        auth: {
          flowType: "pkce",
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          storage: window.localStorage,
        },
      },
    );
  }
  return magicLinkClient;
}

/** Copy session into @supabase/ssr cookie storage so dashboard/server routes see the user. */
export async function syncAuthSessionToCookies(): Promise<void> {
  const { data: sessionData, error } = await createMagicLinkAuthClient().auth.getSession();
  if (error || !sessionData.session) {
    throw error ?? new Error("No session after sign-in");
  }
  const { access_token, refresh_token } = sessionData.session;
  const cookieClient = createSupabaseBrowserClient();
  const { error: setError } = await cookieClient.auth.setSession({
    access_token,
    refresh_token,
  });
  if (setError) throw setError;
}
