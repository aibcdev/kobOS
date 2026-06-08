"use client";

import type { EmailOtpType } from "@supabase/supabase-js";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { completeMagicLinkSignIn } from "@/lib/auth/complete-magic-link-sign-in";
import {
  clearAuthNextCookie,
  readAuthNextCookie,
  safeNextPath,
} from "@/lib/auth/auth-next-cookie";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      const authError =
        searchParams.get("error_description") ?? searchParams.get("error");
      if (authError) {
        router.replace(
          `/login?error=exchange&detail=${encodeURIComponent(authError)}`,
        );
        return;
      }

      const next = safeNextPath(
        searchParams.get("next") ?? readAuthNextCookie(),
      );

      const params = {
        code: searchParams.get("code"),
        tokenHash: searchParams.get("token_hash"),
        otpType: searchParams.get("type") as EmailOtpType | null,
        token: searchParams.get("token"),
        email: searchParams.get("email"),
      };

      if (
        !params.code &&
        !(params.tokenHash && params.otpType) &&
        !(params.token && params.otpType)
      ) {
        router.replace("/login?error=missing_code");
        return;
      }

      const supabase = createSupabaseBrowserClient();

      try {
        await completeMagicLinkSignIn(supabase, params);

        const profileRes = await fetch("/api/auth/complete", {
          method: "POST",
          credentials: "include",
        });
        if (!profileRes.ok) {
          router.replace("/login?error=profile");
          return;
        }

        clearAuthNextCookie();
        if (!cancelled) router.replace(next);
      } catch (err) {
        const detail = err instanceof Error ? err.message : "sign_in_failed";
        const isPkce =
          detail.includes("PKCE") || detail.includes("code verifier");
        if (!cancelled) {
          router.replace(
            isPkce
              ? "/login?error=pkce_link"
              : `/login?error=exchange&detail=${encodeURIComponent(detail)}`,
          );
        }
      }
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f9f3ed] px-6">
      <p className="text-sm text-[#2c2c2c]/80">Signing you in…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f9f3ed] px-6">
          <p className="text-sm text-[#2c2c2c]/80">Signing you in…</p>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
