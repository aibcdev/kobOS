"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { AuditLeadFormFields } from "@/components/marketing/audit/AuditLeadFormFields";
import { auditModalPanel } from "@/lib/marketing/audit-theme";
import { onlineHealthLabel } from "@/lib/marketing/audit-grader-phases";
import { marketingCopy } from "@/lib/marketing/copy";
import { decodeHtmlEntities } from "@/lib/marketing/decode-html-entities";

export type AuditUnlockTeaser = {
  score?: number | null;
  leakPercentLow?: number;
  leakPercentHigh?: number;
  revenueLeakCount?: number;
  screenshotUrl?: string | null;
  lostRevenueGbp?: number | null;
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
}: {
  auditId: string;
  restaurantName: string;
  competitorNames?: string[];
  teaser?: AuditUnlockTeaser;
  open: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const displayName = decodeHtmlEntities(restaurantName);
  const score = teaser?.score;
  const hasLeak =
    teaser?.leakPercentLow != null &&
    teaser?.leakPercentHigh != null &&
    teaser.leakPercentHigh > teaser.leakPercentLow;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = dialogRef.current?.querySelector<HTMLElement>(
      "input, button, [href], textarea, select",
    );
    first?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--color-ink)]/50 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-unlock-title"
      id="audit-unlock"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div ref={dialogRef} className={`relative w-full max-w-md ${auditModalPanel}`}>
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
          {teaser?.lostRevenueGbp
            ? `We estimate ~£${teaser.lostRevenueGbp.toLocaleString("en-GB")}/mo in lost revenue from online gaps.`
            : competitorSubtitle(competitorNames)}
        </p>

        {score != null && Number.isFinite(score) ? (
          <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-cream)]/50 px-4 py-3 text-center">
            <p className="font-head text-3xl font-semibold tabular-nums text-[var(--color-ink)]">{score}</p>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-medium)]">
              Marketing maturity · {scoreTeaserLabel(score)}
            </p>
            {teaser?.lostRevenueGbp ? (
              <p className="mt-2 text-sm font-medium text-[#dc2626]">
                Est. £{teaser.lostRevenueGbp.toLocaleString("en-GB")}/mo lost
              </p>
            ) : hasLeak ? (
              <p className="mt-2 text-sm font-medium text-[#ea580c]">
                {teaser!.leakPercentLow}–{teaser!.leakPercentHigh}% booking leak estimated
              </p>
            ) : null}
            {teaser?.revenueLeakCount ? (
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                ~{teaser.revenueLeakCount} customers/mo may be choosing competitors
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-cream)]/40 p-5">
          <AuditLeadFormFields
            auditId={auditId}
            formId="audit-unlock-modal"
            hideLegal
            onSuccess={() => router.refresh()}
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
      </div>
    </div>
  );
}
