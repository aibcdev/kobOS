"use client";

import type { PerceptionAuditV1 } from "@/lib/audit/types";

const impactStyle = {
  high: "bg-red-50 text-red-800 border-red-100",
  medium: "bg-amber-50 text-amber-900 border-amber-100",
  low: "bg-[var(--color-surface-cream)] text-[var(--color-muted)] border-[var(--color-hairline)]",
} as const;

export function AuditRevenueLeaks({ leaks }: { leaks: PerceptionAuditV1["revenueLeaks"] }) {
  if (!leaks.length) return null;
  return (
    <div className="rounded-2xl border border-[var(--color-hairline)] bg-white p-6">
      <h3 className="font-head text-base font-semibold text-[var(--color-ink)]">Revenue leaks</h3>
      <p className="mt-1 text-sm text-[var(--color-muted)]">Invisible leakage — brand equity left on the table</p>
      <ul className="mt-5 space-y-4">
        {leaks.map((leak) => (
          <li
            key={leak.title}
            className="rounded-xl border border-[var(--color-hairline)] p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-[var(--color-ink)]">{leak.title}</span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${impactStyle[leak.impact]}`}
              >
                {leak.impact} impact
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{leak.narrative}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
