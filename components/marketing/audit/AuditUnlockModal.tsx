"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { AuditLeadFormFields } from "@/components/marketing/audit/AuditLeadFormFields";
import { auditModalPanel } from "@/lib/marketing/audit-theme";
import { marketingCopy } from "@/lib/marketing/copy";
import { decodeHtmlEntities } from "@/lib/marketing/decode-html-entities";

function competitorSubtitle(names: string[]) {
  const a = names[0] ?? "local leaders";
  const b = names[1] ?? "top competitors in your area";
  return marketingCopy.auditUnlock.modalSubtitleCompetitors
    .replace("{competitorA}", a)
    .replace("{competitorB}", b);
}

export function AuditUnlockModal({
  auditId,
  restaurantName,
  competitorNames = [],
  open,
}: {
  auditId: string;
  restaurantName: string;
  competitorNames?: string[];
  open: boolean;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const displayName = decodeHtmlEntities(restaurantName);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = dialogRef.current?.querySelector<HTMLElement>(
      "input, button, [href], textarea, select",
    );
    first?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") e.preventDefault();
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--color-ink)]/50 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-unlock-title"
    >
      <div ref={dialogRef} className={`relative w-full max-w-md ${auditModalPanel}`}>
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-muted-faint)] text-[var(--color-muted)]">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>
        <h2
          id="audit-unlock-title"
          className="mt-4 text-center font-head text-2xl font-semibold tracking-tight text-[var(--color-ink)]"
        >
          {marketingCopy.auditUnlock.modalTitle}
        </h2>
        <p className="mt-2 text-center text-sm leading-relaxed text-[var(--color-muted)]">
          {competitorSubtitle(competitorNames)}
        </p>
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
          <Link href="/" className="underline underline-offset-2">
            Privacy policy
          </Link>
        </p>
      </div>
    </div>
  );
}
