"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuditLeadFormFields } from "@/components/marketing/audit/AuditLeadFormFields";
import { auditModalPanel } from "@/lib/marketing/audit-theme";
import { onlineHealthLabel } from "@/lib/marketing/audit-grader-phases";
import { marketingCopy } from "@/lib/marketing/copy";
import { buildSignupTrialHref } from "@/lib/marketing/signup-trial-href";

export type AuditUnlockTeaser = {
  score?: number | null;
  screenshotUrl?: string | null;
};

function competitorSubtitle(names: string[]) {
  const a = names[0] ?? "local leaders";
  const b = names[1] ?? "top competitors in your area";
  return marketingCopy.auditUnlock.modalSubtitleCompetitors
    .replace("{competitorA}", a)
    .replace("{competitorB}", b);
}

function scoreTeaserLabel(score: number): string {
  if (score < 45) return "Critical gap";
  if (score < 65) return "Needs attention";
  return onlineHealthLabel(score);
}

export function AuditUnlockModal({
  auditId,
  restaurantName,
  competitorNames = [],
  teaser,
  open,
  onClose,
  initialEmail = null,
  /** When true, user must enter email — no dismiss via Escape / backdrop on lead step. */
  required = false,
  signupHref: signupHrefProp,
}: {
  auditId: string;
  restaurantName: string;
  competitorNames?: string[];
  teaser?: AuditUnlockTeaser;
  open: boolean;
  onClose?: () => void;
  initialEmail?: string | null;
  required?: boolean;
  /** Prefers parent-built href; falls back to audit id. */
  signupHref?: string;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const score = teaser?.score;
  const [step, setStep] = useState<"lead" | "trial">("lead");
  const [leadEmail, setLeadEmail] = useState(initialEmail?.trim() || "");

  useEffect(() => {
    if (!open) {
      setStep("lead");
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = dialogRef.current?.querySelector<HTMLElement>(
      "input, button, [href], textarea, select",
    );
    first?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (step === "trial") {
          finishToReport();
          return;
        }
        if (!required) onClose?.();
      }
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- finishToReport is stable enough for escape
  }, [open, onClose, required, step]);

  function finishToReport() {
    router.refresh();
  }

  if (!open) return null;

  const trialHref =
    signupHrefProp ||
    buildSignupTrialHref({
      auditIdOrSlug: auditId,
      email: leadEmail || initialEmail,
      restaurantName,
    });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--color-ink)]/50 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-unlock-title"
      id="audit-unlock"
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        if (step === "trial") {
          finishToReport();
          return;
        }
        if (!required) onClose?.();
      }}
    >
      <div ref={dialogRef} className={`relative w-full max-w-md ${auditModalPanel}`}>
        {step === "lead" ? (
          <>
            {teaser?.screenshotUrl ? (
              <div className="mx-auto h-16 w-28 overflow-hidden rounded-lg border border-[var(--color-hairline)] shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={teaser.screenshotUrl}
                  alt=""
                  className="h-full w-full object-cover object-top"
                />
              </div>
            ) : (
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-muted-faint)] text-[var(--color-muted)]">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
              </div>
            )}
            <h2
              id="audit-unlock-title"
              className="mt-4 text-center font-head text-2xl font-semibold tracking-tight text-[var(--color-ink)]"
            >
              {marketingCopy.auditUnlock.modalTitle}
            </h2>
            <p className="mt-2 text-center text-sm leading-relaxed text-[var(--color-muted)]">
              {competitorNames.length
                ? competitorSubtitle(competitorNames)
                : "Enter your email to unlock the full report."}
            </p>

            {score != null && Number.isFinite(score) ? (
              <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-cream)]/50 px-4 py-3 text-center">
                <p className="font-head text-3xl font-semibold tabular-nums text-[var(--color-ink)]">{score}</p>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-medium)]">
                  Marketing maturity · {scoreTeaserLabel(score)}
                </p>
              </div>
            ) : null}

            <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-cream)]/40 p-5">
              <AuditLeadFormFields
                auditId={auditId}
                formId="audit-unlock-modal"
                hideLegal
                emailOnly
                initialEmail={initialEmail}
                onSuccess={(email) => {
                  if (email?.trim()) setLeadEmail(email.trim());
                  setStep("trial");
                }}
              />
            </div>
            <p className="mt-4 text-center text-xs leading-relaxed text-[var(--color-muted-medium)]">
              {marketingCopy.auditUnlock.legal}{" "}
              <Link href="/terms" className="underline underline-offset-2">
                Terms
              </Link>
              {" · "}
              <Link href="/privacy" className="underline underline-offset-2">
                Privacy
              </Link>
            </p>
          </>
        ) : (
          <>
            <h2
              id="audit-unlock-title"
              className="text-center font-head text-2xl font-semibold tracking-tight text-[var(--color-ink)]"
            >
              {marketingCopy.auditUnlock.trialSoftTitle}
            </h2>
            <p className="mt-2 text-center text-sm leading-relaxed text-[var(--color-muted)]">
              {marketingCopy.auditUpgrade.body}
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-[var(--color-ink)]">
              {marketingCopy.auditUpgrade.bullets.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="mt-0.5 text-[var(--color-forest)]" aria-hidden>
                    ✓
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href={trialHref}
                className="flex h-12 items-center justify-center rounded-xl bg-[var(--color-forest)] text-sm font-semibold text-white transition hover:bg-[var(--color-forest-mid)]"
              >
                {marketingCopy.auditUnlock.trialSoftCta}
              </Link>
              <button
                type="button"
                onClick={finishToReport}
                className="h-11 rounded-xl border border-[var(--color-hairline)] bg-white text-sm font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-surface-cream)]"
              >
                {marketingCopy.auditUnlock.trialSoftSkip}
              </button>
            </div>
            <p className="mt-4 text-center text-xs text-[var(--color-muted-medium)]">
              No card to start · Your full report stays free either way
            </p>
          </>
        )}
      </div>
    </div>
  );
}
