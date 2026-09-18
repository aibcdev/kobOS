import Link from "next/link";
import { Suspense } from "react";

import { SaasAuthForm } from "./SaasAuthForm";

export function SaasAuthPage({ defaultMode = "signin" }: { defaultMode?: "signin" | "signup" }) {
  const isSignUp = defaultMode === "signup";

  return (
    <div className="bg-bone px-5 pb-20 pt-28 sm:px-8">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
        <div className="max-w-lg">
          <h1 className="font-display text-headline font-medium tracking-tight text-espresso">
            {isSignUp ? "Hire KOB" : "Talk to KOB"}
          </h1>
          <p className="mt-4 text-[1.05rem] leading-relaxed text-ink">
            {isSignUp
              ? "Google or email. No password. You land in Talk."
              : "Continue with Google, or email a one-time code. Same login as Try KOB."}
          </p>
          <ul className="mt-8 space-y-3 text-sm text-ink">
            {(isSignUp
              ? [
                  "Google, reviews, hours, invoices",
                  "You choose what goes on autopilot",
                  "Phone answering is Coming soon",
                ]
              : [
                  "Open Talk for your restaurant",
                  "Hours, reviews, and invoices in one place",
                  "Nothing live on Google until the job is verified",
                ]
            ).map((bullet) => (
              <li key={bullet} className="flex gap-2">
                <span className="text-sage" aria-hidden>
                  ✓
                </span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
          <p className="mt-10 text-xs leading-relaxed text-muted">
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

        <Suspense fallback={<div className="h-96 animate-pulse rounded-[1.75rem] bg-cream" />}>
          <SaasAuthForm defaultMode={defaultMode} />
        </Suspense>
      </div>
    </div>
  );
}
