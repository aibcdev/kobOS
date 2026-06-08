"use client";

import type { PerceptionAuditV1 } from "@/lib/audit/types";

function barTone(score: number) {
  if (score <= 4) return "bg-[#ea580c]";
  if (score <= 6) return "bg-[#d97706]";
  return "bg-[var(--color-accent)]";
}

export function AuditExecutiveSummary({
  perception,
}: {
  perception: PerceptionAuditV1;
}) {
  const exec = perception.executiveSummary;
  if (!exec) return null;

  return (
    <section className="rounded-2xl border border-[var(--color-hairline)] bg-white p-6 shadow-sm">
      <h2 className="font-head text-lg font-semibold">Executive summary</h2>
      <ul className="mt-4 space-y-2 text-sm leading-relaxed text-[var(--color-ink)]">
        {exec.strengths.map((s, idx) => (
          <li key={`strength-${idx}`} className="flex gap-2">
            <span className="text-[var(--color-accent)]" aria-hidden>
              ✓
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm font-medium leading-relaxed text-[var(--color-ink)]">{exec.gapStatement}</p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
        This gap impacts
      </p>
      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
        {exec.impacts.map((i, idx) => (
          <li key={`impact-${idx}`} className="text-sm text-[var(--color-muted)]">
            · {i}
          </li>
        ))}
      </ul>
      {perception.estimatedDwellSeconds ? (
        <p className="mt-4 rounded-xl bg-[var(--color-surface-cream)] px-3 py-2 text-sm text-[var(--color-muted)]">
          Typical guest browsing time:{" "}
          <span className="font-medium text-[var(--color-ink)]">
            {perception.estimatedDwellSeconds.low}–{perception.estimatedDwellSeconds.high} seconds
          </span>
          {" — "}
          {perception.estimatedDwellSeconds.rationale}
        </p>
      ) : null}
    </section>
  );
}

export function AuditVisualScorecard({
  rows,
}: {
  rows: PerceptionAuditV1["visualScorecard"];
}) {
  if (!rows?.length) return null;

  return (
    <section className="rounded-2xl border border-[var(--color-hairline)] bg-white p-6 shadow-sm">
      <h2 className="font-head text-lg font-semibold">Visual scorecard</h2>
      <p className="mt-1 text-xs text-[var(--color-muted-medium)]">
        How guests experience your brand online — scored out of 10 (realistic, not inflated).
      </p>
      <ul className="mt-6 space-y-4">
        {rows.map((row) => (
          <li key={row.category}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium">{row.category}</span>
              <span className="font-head text-lg font-semibold tabular-nums text-[var(--color-primary)]">
                {row.scoreOutOf10}/10
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--color-muted-faint)]">
              <div
                className={`h-full rounded-full ${barTone(row.scoreOutOf10)}`}
                style={{ width: `${row.scoreOutOf10 * 10}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-muted)]">{row.note}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
