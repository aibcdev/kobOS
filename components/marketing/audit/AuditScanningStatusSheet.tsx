"use client";

import type { AuditScanDesignTip } from "@/lib/marketing/audit-scan-tips";

export function AuditScanningStatusSheet({
  progress,
  statusLine,
  secondsRemaining,
  contextLine,
  designTip,
}: {
  progress: number;
  statusLine: string;
  secondsRemaining: number;
  contextLine?: string;
  designTip?: AuditScanDesignTip;
}) {
  const pct = Math.min(100, Math.max(0, progress));

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-6 pt-2 sm:px-6">
      <div className="mx-auto max-w-lg overflow-hidden rounded-t-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] shadow-[var(--shadow-card-elevated)]">
        <div className="h-1 w-full bg-[var(--color-muted-faint)]">
          <div
            className="h-full bg-[var(--color-body-black)] transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-start gap-4 px-5 py-4">
          <span
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-accent)] border-t-transparent"
            aria-hidden
          >
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="type-body-md truncate font-medium text-[var(--color-ink)]">{statusLine}</p>
            <p className="type-caption mt-0.5 text-[var(--color-muted-medium)]">
              {secondsRemaining > 0 ? `${secondsRemaining} seconds remaining` : "Finishing up…"}
            </p>
            {designTip ? (
              <div key={designTip.id} className="mt-2 border-t border-[var(--color-hairline)] pt-2">
                <p className="type-caption font-medium text-[var(--color-primary)]">{designTip.title}</p>
                <p className="type-caption mt-0.5 line-clamp-2 leading-snug text-[var(--color-muted)]">
                  {designTip.body}
                </p>
              </div>
            ) : contextLine ? (
              <p className="type-caption mt-1 text-[var(--color-muted-medium)]">{contextLine}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
