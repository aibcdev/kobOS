"use client";

import Link from "next/link";
import type { AuditUserMessage } from "@/lib/audit/audit-start-errors";

export function AuditFormAlert({
  alert,
  onRetry,
  id,
}: {
  alert: AuditUserMessage;
  onRetry?: () => void;
  id?: string;
}) {
  const showDev = Boolean(alert.devHint && process.env.NODE_ENV === "development");

  return (
    <div
      id={id}
      role="alert"
      className="mt-6 overflow-hidden rounded-2xl border border-[var(--color-hairline)] bg-white text-left shadow-[0_12px_40px_-16px_rgba(9,68,19,0.12)]"
    >
      <div className="border-b border-[var(--color-hairline)] bg-[var(--color-canvas)]/40 px-5 py-4 md:px-6">
        <div className="flex gap-4">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] font-head text-lg font-semibold text-white"
            aria-hidden
          >
            !
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="font-head text-base font-semibold tracking-tight text-[var(--color-ink)] md:text-lg">
              {alert.title}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted)] md:text-[15px]">
              {alert.message}
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 md:px-6">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--color-primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent)]"
          >
            Try again
          </button>
        ) : null}
        <Link
          href="/demo"
          className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-cream)] px-5 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-warm)]"
        >
          Book a demo
        </Link>
      </div>
      {showDev ? (
        <details className="border-t border-[var(--color-hairline)] bg-[var(--color-surface-warm)]/60 px-5 py-3 md:px-6">
          <summary className="cursor-pointer text-xs font-medium text-[var(--color-muted-medium)]">
            Technical details (dev only)
          </summary>
          <p className="mt-2 font-mono text-xs leading-relaxed text-[var(--color-muted)]">{alert.devHint}</p>
        </details>
      ) : null}
    </div>
  );
}
