"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { marketingCopy } from "@/lib/marketing/copy";

type Mode = "signin" | "signup";

export function SaasAuthForm({ defaultMode = "signin" }: { defaultMode?: Mode }) {
  const params = useSearchParams();
  const modeParam = params.get("mode");
  const initialMode: Mode = modeParam === "signup" ? "signup" : defaultMode;
  const [mode, setMode] = useState<Mode>(initialMode);
  const err = params.get("error");
  const plan = params.get("plan");
  const planTier = plan === "flat" ? "pro" : plan === "flex" ? "starter" : null;
  const nextPathRaw = params.get("next")?.trim();
  const defaultNext = planTier ? `/dashboard/billing?tier=${planTier}` : "/dashboard";
  const nextPath =
    nextPathRaw && nextPathRaw.startsWith("/") && !nextPathRaw.startsWith("//") ? nextPathRaw : defaultNext;
  const emailFromQuery = params.get("email")?.trim() ?? "";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");

  useEffect(() => {
    if (emailFromQuery) setEmail(emailFromQuery);
  }, [emailFromQuery]);

  useEffect(() => {
    if (modeParam === "signup") setMode("signup");
    if (modeParam === "signin") setMode("signin");
  }, [modeParam]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createSupabaseBrowserClient();
    setStatus("idle");
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
        : undefined;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });
    setStatus(error ? "error" : "sent");
  }

  const missingEnv = err === "missing_env";
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
      {err === "exchange" ? (
        <p className="mt-4 text-sm text-red-600">We could not complete sign-in. Try again.</p>
      ) : null}

      {status === "sent" ? (
        <p className="mt-6 rounded-xl bg-[#f9f3ed] p-4 text-sm text-[#2c2c2c]/80">{marketingCopy.auth.sent}</p>
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
          {status === "error" ? <p className="text-sm text-red-600">Could not send link. Try again.</p> : null}
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
