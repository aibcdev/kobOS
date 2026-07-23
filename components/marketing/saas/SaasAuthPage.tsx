import Link from "next/link";
import { Suspense } from "react";

import { marketingCopy } from "@/lib/marketing/copy";

import { SaasAuthForm } from "./SaasAuthForm";

/**
 * Owner-style auth: quiet brand panel + embedded Supabase magic-link / OTP card.
 */
export function SaasAuthPage({ defaultMode = "signin" }: { defaultMode?: "signin" | "signup" }) {
  const isSignUp = defaultMode === "signup";

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#f7f5f2] px-6 py-12 md:py-20">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
        <div className="max-w-lg">
          <Link
            href="/"
            className="text-sm text-[#2c2c2c]/55 transition-colors hover:text-[#094413]"
          >
            ← Back to home
          </Link>
          <Link href="/" className="mt-10 inline-flex items-center gap-1.5 no-underline">
            <span className="text-2xl font-bold tracking-tight text-[#094413]">KOB</span>
            <span className="block h-2 w-2 rounded-full bg-[#088924]" />
          </Link>
          <h1 className="mt-8 text-3xl font-semibold tracking-tight text-[#1a1a1a] md:text-4xl">
            {isSignUp ? "Start growing online" : "Welcome back"}
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-[#2c2c2c]/70">
            {isSignUp
              ? "Create your account with email — no password. We use secure Supabase sign-in so you can open your dashboard in one click."
              : "Sign in with email. We send a one-time code (and a magic link) via Supabase — same login restaurants use after the free AI scan."}
          </p>
          <ul className="mt-8 space-y-3 text-sm text-[#2c2c2c]/80">
            {(isSignUp
              ? [
                  "Free AI scan of how you look online",
                  "Requests for website, SEO, and brand work",
                  "One login for discovery + sales tools",
                ]
              : marketingCopy.auth.bullets
            ).map((bullet) => (
              <li key={bullet} className="flex gap-2">
                <span className="text-[#088924]" aria-hidden>
                  ✓
                </span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
          <p className="mt-10 text-xs leading-relaxed text-[#2c2c2c]/45">
            Secure sign-in via Supabase. By continuing you agree to our{" "}
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

        <Suspense fallback={<div className="h-96 animate-pulse rounded-[1.5rem] bg-white/60" />}>
          <SaasAuthForm defaultMode={defaultMode} />
        </Suspense>
      </div>
    </div>
  );
}
