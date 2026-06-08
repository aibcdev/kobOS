"use client";

import type { PerceptionAuditV1 } from "@/lib/audit/types";

export function AuditPositioningTable({ rows }: { rows: PerceptionAuditV1["positioningTable"] }) {
  if (!rows.length) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-hairline)]">
      <div className="border-b border-[var(--color-hairline)] bg-[var(--color-surface-cream)]/80 px-5 py-3">
        <h3 className="font-head text-base font-semibold text-[var(--color-ink)]">Where you are vs where you should be</h3>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Perceived quality across your digital presence</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-hairline)] bg-white">
              <th className="px-5 py-3 font-medium text-[var(--color-muted-medium)]">Area</th>
              <th className="px-5 py-3 font-medium text-[var(--color-muted-medium)]">Current</th>
              <th className="px-5 py-3 font-medium text-[var(--color-primary)]">Ideal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.area} className="border-b border-[var(--color-hairline)] last:border-0">
                <td className="px-5 py-3.5 font-medium text-[var(--color-ink)]">{row.area}</td>
                <td className="px-5 py-3.5 text-[var(--color-muted)]">{row.current}</td>
                <td className="px-5 py-3.5 font-medium text-[var(--color-ink)]">{row.ideal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
