"use client";

import type { PerceptionAuditV1 } from "@/lib/audit/types";
import { auditBlurGate } from "@/lib/marketing/audit-theme";

export function AuditPerceptionGapTable({
  rows,
  locked,
}: {
  rows: PerceptionAuditV1["perceptionGap"];
  locked?: boolean;
}) {
  if (!rows.length) return null;
  return (
    <div className={`overflow-hidden rounded-2xl border border-[var(--color-hairline)] ${locked ? auditBlurGate : ""}`}>
      <div className="border-b border-[var(--color-hairline)] bg-[#094413] px-5 py-4 text-[#fbf8f5]">
        <h3 className="font-head text-base font-semibold">Perception gap</h3>
        <p className="mt-1 text-sm text-white/75">The commercial distance between today and your potential</p>
      </div>
      <div className="overflow-x-auto bg-white">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-hairline)]">
              <th className="px-5 py-3 font-medium text-[var(--color-muted-medium)]">Metric</th>
              <th className="px-5 py-3 font-medium text-[var(--color-muted-medium)]">Current</th>
              <th className="px-5 py-3 font-medium text-[var(--color-primary)]">Potential</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.metric} className="border-b border-[var(--color-hairline)] last:border-0">
                <td className="px-5 py-3.5 font-medium text-[var(--color-ink)]">{row.metric}</td>
                <td className="px-5 py-3.5 text-[var(--color-muted)]">{row.current}</td>
                <td className="px-5 py-3.5 font-semibold text-[var(--color-primary)]">{row.potential}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
