"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AUTH_NEXT_COOKIE, AUTH_NEXT_MAX_AGE_SEC } from "@/lib/auth/auth-next-cookie";
import { withTimeout } from "@/lib/auth/with-timeout";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { createMagicLinkAuthClient } from "@/lib/supabase/magic-link-auth";
import { marketingCopy } from "@/lib/marketing/copy";

type Mode = "signin" | "signup";

const LOGIN_EMAIL_KEY = "kob_login_email";
const VERIFY_OTP_TIMEOUT_MS = 15_000;

export function SaasAuthForm({ defaultMode = "signin" }: { defaultMode?: Mode }) {
  const params = useSearchParams();
  const modeParam = params.get("mode");
  const initialMode: Mode = modeParam === "signup" ? "signup" : defaultMode;
  const [mode, setMode] = useState<Mode>(initialMode);
  const err = params.get("error");
  const errDetail = params.get("detail");
  const plan = params.get("plan");
  const planTier = plan === "flat" ? "pro" : plan === "flex" ? "starter" : null;
  const nextPathRaw = params.get("next")?.trim() ?? params.get("redirect")?.trim();
  const defaultNext = planTier ? `/dashboard/billing?tier=${planTier}` : "/app";
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
    if (emailFromQuery) {
      setEmail(emailFromQuery);
      return;
    }
    try {
      const saved = sessionStorage.getItem(LOGIN_EMAIL_KEY)?.trim();
      if (saved) setEmail(saved);
    } catch {
      /* ignore */
    }
  }, [emailFromQuery]);

  useEffect(() => {
    if (modeParam === "signup") setMode("signup");
    if (modeParam === "signin") setMode("signin");
  }, [modeParam]);

  async function signInWithGoogle() {
    setErrorMessage(null);
    if (!supabaseConfigured) {
      setStatus("error");
      setErrorMessage("Supabase keys missing. Add them to .env.local and restart.");
      return;
    }
    if (typeof window !== "undefined") {
      document.cookie = `${AUTH_NEXT_COOKIE}=${encodeURIComponent(nextPath)};path=/;max-age=${AUTH_NEXT_MAX_AGE_SEC};SameSite=Lax`;
    }
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      setStatus("error");
      setErrorMessage(
        error.message.toLowerCase().includes("provider")
          ? "Google login is not switched on yet in Supabase Auth. Turn on the Google provider, then try again."
          : error.message,
      );
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    if (!supabaseConfigured) {
      setStatus("error");
      setErrorMessage("Supabase keys missing. Add them to .env.local and restart npm run dev:public.");
      return;
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setStatus("error");
      setErrorMessage("Enter your email address.");
      return;
    }
    setStatus("idle");
    try {
      sessionStorage.setItem(LOGIN_EMAIL_KEY, trimmedEmail);
    } catch {
      /* ignore */
    }
    if (typeof window !== "undefined") {
      document.cookie = `${AUTH_NEXT_COOKIE}=${encodeURIComponent(nextPath)};path=/;max-age=${AUTH_NEXT_MAX_AGE_SEC};SameSite=Lax`;
    }

    const resendRoute = await fetch("/api/auth/send-magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmedEmail }),
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
      email: trimmedEmail,
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
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setStatus("idle");
      setErrorMessage("Enter the email you used to request the code, then try again.");
      return;
    }
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

    try {
      let verifyError: { message: string } | null = null;
      try {
        const first = await withTimeout(
          supabase.auth.verifyOtp({
            email: trimmedEmail,
            token: trimmed,
            type: "email",
          }),
          VERIFY_OTP_TIMEOUT_MS,
          "verify_timeout",
        );
        verifyError = first.error;
      } catch (err) {
        if (err instanceof Error && err.message === "verify_timeout") {
          setStatus("sent");
          setErrorMessage("Sign-in timed out. Check your connection and try the code again.");
          return;
        }
        throw err;
      }

      // Resend path generates a magiclink OTP — retry with that type if email fails.
      if (verifyError) {
        const msg = verifyError.message.toLowerCase();
        const maybeWrongType =
          msg.includes("otp") || msg.includes("token") || msg.includes("invalid") || msg.includes("expired");
        if (maybeWrongType) {
          try {
            const second = await withTimeout(
              supabase.auth.verifyOtp({
                email: trimmedEmail,
                token: trimmed,
                type: "magiclink",
              }),
              VERIFY_OTP_TIMEOUT_MS,
              "verify_timeout",
            );
            if (!second.error) verifyError = null;
            else verifyError = second.error;
          } catch (err) {
            if (err instanceof Error && err.message === "verify_timeout") {
              setStatus("sent");
              setErrorMessage("Sign-in timed out. Check your connection and try the code again.");
              return;
            }
            throw err;
          }
        }
      }

      if (verifyError) {
        setStatus("sent");
        setErrorMessage(verifyError.message);
        return;
      }

      try {
        await fetch("/api/auth/complete", {
          method: "POST",
          credentials: "include",
          signal: AbortSignal.timeout(8_000),
        });
      } catch {
        /* layout will ensure profile */
      }

      try {
        sessionStorage.removeItem(LOGIN_EMAIL_KEY);
      } catch {
        /* ignore */
      }

      // Hard navigation so soft-nav cannot leave this form stuck on "Signing in…"
      // while a cold dashboard layout waits on the database.
      window.location.assign(nextPath);
    } catch (err) {
      setStatus("sent");
      setErrorMessage(err instanceof Error ? err.message : "Could not sign in. Try again.");
    }
  }

  const missingEnv = err === "missing_env" || !supabaseConfigured;
  const isSignUp = mode === "signup";

  return (
    <div className="rounded-[1.75rem] border border-line bg-paper p-8 shadow-soft">
      <div className="mb-6 flex rounded-full bg-cream p-1">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`flex-1 rounded-full py-2.5 text-sm font-medium transition-colors ${
            !isSignUp ? "bg-espresso text-paper shadow-sm" : "text-muted"
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-full py-2.5 text-sm font-medium transition-colors ${
            isSignUp ? "bg-espresso text-paper shadow-sm" : "text-muted"
          }`}
        >
          Sign up
        </button>
      </div>

      <h1 className="font-display text-title font-medium tracking-tight text-espresso">
        {isSignUp ? marketingCopy.auth.signUpTitle : marketingCopy.auth.signInTitle}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink">
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

      {status === "idle" || status === "error" ? (
        <>
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-espresso/15 bg-paper text-sm font-medium text-espresso hover:bg-cream"
          >
            <GoogleMark />
            Continue with Google
          </button>
          <p className="mt-4 text-center text-xs text-muted">or use email</p>
        </>
      ) : null}

      {status === "sent" || status === "verifying" ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl bg-cream p-4 text-sm text-ink">
            <p>{marketingCopy.auth.sent}</p>
            {email.trim() ? (
              <p className="mt-1 text-[#2c2c2c]/65">
                Sent to <strong>{email.trim()}</strong>
              </p>
            ) : null}
            <p className="mt-2 text-[#2c2c2c]/65">
              Easiest: enter the <strong>sign-in code</strong> from the email below (works in any browser).
            </p>
          </div>
          <form className="flex flex-col gap-3" onSubmit={verifyOtpCode}>
            {!email.trim() ? (
              <label className="text-sm font-medium text-[#2c2c2c]">
                Email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-line bg-bone px-4 py-3 text-sm outline-none focus:border-espresso/40 focus:ring-2 focus:ring-espresso/15"
                />
              </label>
            ) : null}
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
                className="mt-1.5 w-full rounded-2xl border border-line bg-bone px-4 py-3 text-center font-mono text-lg tracking-widest outline-none focus:border-espresso/40 focus:ring-2 focus:ring-espresso/15"
              />
            </label>
            {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
            <button
              type="submit"
              disabled={status === "verifying"}
              className="h-12 rounded-full bg-espresso text-sm font-semibold text-paper transition-colors hover:bg-ink disabled:opacity-60"
            >
              {status === "verifying" ? "Signing in…" : "Sign in with code"}
            </button>
            <button
              type="button"
              disabled={status === "verifying"}
              className="text-sm text-[#2c2c2c]/60 underline-offset-2 hover:underline disabled:opacity-50"
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
              className="mt-1.5 w-full rounded-2xl border border-line bg-bone px-4 py-3 text-sm outline-none focus:border-espresso/40 focus:ring-2 focus:ring-espresso/15"
            />
          </label>
          {status === "error" ? (
            <p className="text-sm text-red-600">{errorMessage ?? "Could not send link. Try again."}</p>
          ) : null}
          <button
            type="submit"
            className="h-12 rounded-full bg-espresso text-sm font-semibold text-paper transition-colors hover:bg-ink"
          >
            {isSignUp ? marketingCopy.auth.submitSignUp : marketingCopy.auth.submitSignIn}
          </button>
        </form>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.17.26-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
