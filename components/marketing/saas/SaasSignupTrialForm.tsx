"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AUTH_NEXT_COOKIE, AUTH_NEXT_MAX_AGE_SEC } from "@/lib/auth/auth-next-cookie";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { createMagicLinkAuthClient } from "@/lib/supabase/magic-link-auth";
import { marketingCopy } from "@/lib/marketing/copy";

import { SaasIcon } from "./SaasIcon";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-[#2c2c2c]/12 bg-white px-3.5 py-3 text-sm text-[#1a1a1a] outline-none placeholder:text-[#2c2c2c]/35 focus:border-[var(--color-forest)] focus:ring-2 focus:ring-[var(--color-forest)]/15";

const LOCATION_OPTIONS = [
  { value: "1", label: "1 location" },
  { value: "2-5", label: "2–5 locations" },
  { value: "6-15", label: "6–15 locations" },
  { value: "16+", label: "16+ locations" },
] as const;

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner / founder" },
  { value: "gm", label: "General manager" },
  { value: "marketing", label: "Marketing / ops" },
  { value: "other", label: "Something else" },
] as const;

export const SIGNUP_INTENT_KEY = "kob_signup_intent";

export function SaasSignupTrialForm() {
  const router = useRouter();
  const params = useSearchParams();
  const plan = params.get("plan");
  const planTier = plan === "flat" ? "pro" : plan === "flex" ? "starter" : null;
  const nextPath = planTier ? `/dashboard/billing?tier=${planTier}` : "/dashboard?welcome=1";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [locations, setLocations] = useState("");
  const [role, setRole] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "verifying" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );

  useEffect(() => {
    const emailFromQuery = params.get("email")?.trim();
    if (emailFromQuery) setEmail(emailFromQuery);
  }, [params]);

  function persistIntent() {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(
        SIGNUP_INTENT_KEY,
        JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          restaurantName: restaurantName.trim(),
          locations,
          role,
        }),
      );
    } catch {
      /* ignore */
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    if (!supabaseConfigured) {
      setStatus("error");
      setErrorMessage("Supabase keys missing. Add them to .env.local and restart.");
      return;
    }
    persistIntent();
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
      setErrorMessage(payload.hint ?? payload.error ?? "Could not send sign-in email.");
      return;
    }

    const supabase = createMagicLinkAuthClient();
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/auth/confirm` : undefined;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });
    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }
    setStatus("sent");
  }

  async function verifyOtpCode(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    const trimmed = otpCode.replace(/\s/g, "");
    if (!trimmed || trimmed.length < 6) {
      setErrorMessage("Enter the full sign-in code from your email.");
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

  return (
    <div className="rounded-[1.5rem] border border-[#2c2c2c]/08 bg-white p-6 shadow-[0_24px_60px_-32px_rgba(0,0,0,0.35)] sm:p-8">
      <h2 className="font-heading text-[1.75rem] tracking-tight text-[#1a1a1a] md:text-[1.85rem]">
        Start your free 7-day trial
      </h2>

      {status === "sent" || status === "verifying" ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl bg-[#f9f6f1] p-4 text-sm text-[#2c2c2c]/80">
            <p>{marketingCopy.auth.sent}</p>
            <p className="mt-2 text-[#2c2c2c]/65">
              Enter the <strong>sign-in code</strong> from your email to open your report.
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
                className={`${inputClass} text-center font-mono text-lg tracking-widest`}
              />
            </label>
            {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
            <button
              type="submit"
              disabled={status === "verifying"}
              className="h-12 rounded-xl bg-[var(--color-forest)] text-sm font-semibold text-white transition hover:bg-[var(--color-forest-mid)] disabled:opacity-60"
            >
              {status === "verifying" ? "Opening…" : "Open my report →"}
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
              Edit details / send a new email
            </button>
          </form>
        </div>
      ) : (
        <form className="mt-5 flex flex-col gap-3.5" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium text-[#2c2c2c]">
              First name
              <input
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputClass}
                autoComplete="given-name"
              />
            </label>
            <label className="text-sm font-medium text-[#2c2c2c]">
              Last name
              <input
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClass}
                autoComplete="family-name"
              />
            </label>
          </div>

          <label className="text-sm font-medium text-[#2c2c2c]">
            Work email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              autoComplete="email"
            />
          </label>

          <label className="text-sm font-medium text-[#2c2c2c]">
            Phone number
            <div className="mt-1.5 flex overflow-hidden rounded-xl border border-[#2c2c2c]/12 bg-white focus-within:border-[var(--color-forest)] focus-within:ring-2 focus-within:ring-[var(--color-forest)]/15">
              <span className="flex items-center gap-1.5 border-r border-[#2c2c2c]/10 bg-[#f9f6f1] px-3 text-sm text-[#2c2c2c]/70">
                <span aria-hidden>🇬🇧</span>
                +44
              </span>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07400 123456"
                className="w-full bg-transparent px-3.5 py-3 text-sm outline-none"
                autoComplete="tel"
              />
            </div>
          </label>

          <label className="text-sm font-medium text-[#2c2c2c]">
            Restaurant name
            <input
              required
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              className={inputClass}
              autoComplete="organization"
            />
          </label>

          <label className="text-sm font-medium text-[#2c2c2c]">
            How many locations do you have?
            <select
              required
              value={locations}
              onChange={(e) => setLocations(e.target.value)}
              className={inputClass}
            >
              <option value="" disabled>
                Select…
              </option>
              {LOCATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-[#2c2c2c]">
            What best describes you?
            <select required value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
              <option value="" disabled>
                Select…
              </option>
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          {status === "error" ? (
            <p className="text-sm text-red-600">{errorMessage ?? "Something went wrong. Try again."}</p>
          ) : null}

          <button
            type="submit"
            className="mt-1 h-12 rounded-xl bg-[var(--color-forest)] text-sm font-semibold text-white transition hover:bg-[var(--color-forest-mid)]"
          >
            Get my free report →
          </button>

          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-[#2c2c2c]/50">
            <SaasIcon icon="solar:lock-keyhole-linear" className="text-sm" />
            No card required · Cancel anytime
          </p>
        </form>
      )}

      <p className="mt-4 text-center text-[11px] leading-relaxed text-[#2c2c2c]/40">
        By continuing you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-2">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
