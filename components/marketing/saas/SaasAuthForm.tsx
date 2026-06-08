"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AUTH_NEXT_COOKIE, AUTH_NEXT_MAX_AGE_SEC } from "@/lib/auth/auth-next-cookie";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { createMagicLinkAuthClient } from "@/lib/supabase/magic-link-auth";
import { marketingCopy } from "@/lib/marketing/copy";

type Mode = "signin" | "signup";

export function SaasAuthForm({ defaultMode = "signin" }: { defaultMode?: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const modeParam = params.get("mode");
  const initialMode: Mode = modeParam === "signup" ? "signup" : defaultMode;
  const [mode, setMode] = useState<Mode>(initialMode);
  const err = params.get("error");
  const errDetail = params.get("detail");
  const plan = params.get("plan");
  const planTier = plan === "flat" ? "pro" : plan === "flex" ? "starter" : null;
  const nextPathRaw = params.get("next")?.trim() ?? params.get("redirect")?.trim();
  const defaultNext = planTier ? `/dashboard/billing?tier=${planTier}` : "/dashboard";
  const nextPath =
    nextPathRaw && nextPathRaw.startsWith("/") && !nextPathRaw.startsWith("//") ? nextPathRaw : defaultNext;
  const emailFromQuery = params.get("email")?.trim() ?? "";
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "verifying" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );

  useEffect(() => {
    if (emailFromQuery) setEmail(emailFromQuery);
  }, [emailFromQuery]);

  useEffect(() => {
    if (modeParam === "signup") setMode("signup");
    if (modeParam === "signin") setMode("signin");
  }, [modeParam]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    if (!supabaseConfigured) {
      setStatus("error");
      setErrorMessage("Supabase keys missing. Add them to .env.local and restart npm run dev:public.");
      return;
    }
    setStatus("idle");
    if (typeof window !== "undefined") {
      document.cookie = `${AUTH_NEXT_COOKIE}=${encodeURIComponent(nextPath)};path=/;max-age=${AUTH_NEXT_MAX_AGE_SEC};SameSite=Lax`;
    }

    const resendRoute = await fetch("/api/auth/send-magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    if (resendRoute.ok) {
      setStatus("sent");
      return;
    }

    const payload = (await resendRoute.json().catch(() => ({}))) as {
      error?: string;
      hint?: string;
    };

    if (resendRoute.status !== 503) {
      setStatus("error");
      setErrorMessage(
        payload.hint ??
          payload.error ??
          "Could not send sign-in email. Run npm run auth:test-email for help.",
      );
      return;
    }

    const supabase = createMagicLinkAuthClient();
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/confirm`
        : undefined;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: true,
      },
    });
    if (error) {
      setStatus("error");
      const isSendFail =
        error.message.toLowerCase().includes("sending") ||
        error.message.toLowerCase().includes("magic link");
      setErrorMessage(
        isSendFail
          ? "Supabase cannot send email. Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase → Settings → API), or turn off broken SMTP under Authentication → SMTP."
          : error.message,
      );
      return;
    }
    setStatus("sent");
  }

  async function verifyOtpCode(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    const trimmed = otpCode.replace(/\s/g, "");
    if (!trimmed || trimmed.length < 6 || trimmed.length > 10) {
      setErrorMessage("Enter the full sign-in code from your email (usually 6–8 digits).");
      return;
    }
    if (!supabaseConfigured) {
      setStatus("error");
      setErrorMessage("Supabase keys missing.");
      return;
    }
    setStatus("verifying");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: trimmed,
      type: "email",
    });
    if (error) {
      setStatus("sent");
      setErrorMessage(error.message);
      return;
    }
    const profileRes = await fetch("/api/auth/complete", {
      method: "POST",
      credentials: "include",
    });
    if (!profileRes.ok) {
      setStatus("error");
      setErrorMessage("Account setup failed. Check DATABASE_URL.");
      return;
    }
    router.replace(nextPath);
  }

  const missingEnv = err === "missing_env" || !supabaseConfigured;
  const isSignUp = mode === "signup";

  return (
    <div className="rounded-3xl border border-[#2c2c2c]/10 bg-white p-8 shadow-xl">
      <div className="mb-6 flex rounded-full bg-[#f9f3ed] p-1">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
            !isSignUp ? "bg-[#094413] text-white shadow-sm" : "text-[#2c2c2c]/60"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
            isSignUp ? "bg-[#094413] text-white shadow-sm" : "text-[#2c2c2c]/60"
          }`}
        >
          Create account
        </button>
      </div>

      <h1 className="font-heading text-2xl font-semibold text-[#2c2c2c]">
        {isSignUp ? marketingCopy.auth.signUpTitle : marketingCopy.auth.signInTitle}
      </h1>
      <p className="mt-2 text-sm text-[#2c2c2c]/70">
        {isSignUp ? marketingCopy.auth.signUpBlurb : marketingCopy.auth.signInBlurb}
      </p>

      {missingEnv ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          Add Supabase keys to <code className="text-xs">.env.local</code>.
        </p>
      ) : null}
      {err === "pkce_link" || err === "exchange" ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Sign-in link failed.
          {err === "pkce_link" ||
          errDetail?.includes("PKCE") ||
          errDetail?.includes("code verifier") ? (
            <>
              {" "}
              Skip the link — request a new email below, then enter the <strong>sign-in code</strong> from
              that email on this page. (Or fix the Magic Link template:{" "}
              <code className="text-xs">npm run setup:auth-urls</code>.)
            </>
          ) : errDetail?.toLowerCase().includes("invalid") ||
            errDetail?.toLowerCase().includes("expired") ? (
            <>
              {" "}
              Request a <strong>new</strong> link below (old links stop working after ~1 hour or if you
              requested another). In Supabase → Authentication → URL configuration, add{" "}
              <code className="text-xs">http://localhost:3000/**</code> under Redirect URLs.
            </>
          ) : (
            <>
              {" "}
              In Supabase → Authentication → URL configuration, set Site URL to{" "}
              <code className="text-xs">http://localhost:3000</code> and add Redirect URL{" "}
              <code className="text-xs">http://localhost:3000/**</code>
            </>
          )}
          {errDetail ? ` — ${decodeURIComponent(errDetail)}` : null}
        </p>
      ) : null}
      {err === "missing_code" ? (
        <p className="mt-4 text-sm text-red-600">
          Invalid login link. Request a new email from this page.
        </p>
      ) : null}
      {err === "profile" ? (
        <p className="mt-4 text-sm text-red-600">Account could not be created. Check DATABASE_URL.</p>
      ) : null}

      {status === "sent" || status === "verifying" ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl bg-[#f9f3ed] p-4 text-sm text-[#2c2c2c]/80">
            <p>{marketingCopy.auth.sent}</p>
            <p className="mt-2 text-[#2c2c2c]/65">
              Easiest: enter the <strong>sign-in code</strong> from the email below (works in any browser).
            </p>
          </div>
          <form className="flex flex-col gap-3" onSubmit={verifyOtpCode}>
            <label className="text-sm font-medium text-[#2c2c2c]">
              Sign-in code
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="e.g. 33149398"
                className="mt-1.5 w-full rounded-xl border border-[#2c2c2c]/15 bg-[#fbf8f5] px-4 py-3 text-center font-mono text-lg tracking-widest outline-none focus:border-[#088924] focus:ring-2 focus:ring-[#088924]/20"
              />
            </label>
            {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
            <button
              type="submit"
              disabled={status === "verifying"}
              className="h-12 rounded-full bg-[#094413] text-sm font-semibold text-[#fbf8f5] transition-colors hover:bg-[#088924] disabled:opacity-60"
            >
              {status === "verifying" ? "Signing in…" : "Sign in with code"}
            </button>
            <button
              type="button"
              className="text-sm text-[#2c2c2c]/60 underline-offset-2 hover:underline"
              onClick={() => {
                setStatus("idle");
                setOtpCode("");
                setErrorMessage(null);
              }}
            >
              Send a new email
            </button>
          </form>
        </div>
      ) : (
        <form className="mt-6 flex flex-col gap-4" onSubmit={submit}>
          <label className="text-sm font-medium text-[#2c2c2c]">
            {marketingCopy.auth.emailLabel}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#2c2c2c]/15 bg-[#fbf8f5] px-4 py-3 text-sm outline-none focus:border-[#088924] focus:ring-2 focus:ring-[#088924]/20"
            />
          </label>
          {status === "error" ? (
            <p className="text-sm text-red-600">{errorMessage ?? "Could not send link. Try again."}</p>
          ) : null}
          <button
            type="submit"
            className="h-12 rounded-full bg-[#094413] text-sm font-semibold text-[#fbf8f5] transition-colors hover:bg-[#088924]"
          >
            {isSignUp ? marketingCopy.auth.submitSignUp : marketingCopy.auth.submitSignIn}
          </button>
        </form>
      )}
    </div>
  );
}
