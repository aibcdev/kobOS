"use client";

import type { AuditScanDesignTip } from "@/lib/marketing/audit-scan-tips";

/** Rotating hospitality design tips while the audit runs. */
export function AuditScanningDesignTipStrip({ tip }: { tip: AuditScanDesignTip }) {
  return (
    <div
      key={tip.id}
      className="mx-auto mb-6 w-full max-w-2xl rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 py-3 shadow-sm transition-opacity duration-500"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="type-caption font-semibold uppercase tracking-wide text-[var(--color-primary)]">
        Design insight
      </p>
      <p className="type-label-md mt-1 font-medium text-[var(--color-ink)]">{tip.title}</p>
      <p className="type-body-sm mt-1 leading-relaxed text-[var(--color-muted)]">{tip.body}</p>
    </div>
  );
}
