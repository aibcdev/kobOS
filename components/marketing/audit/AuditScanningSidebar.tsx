"use client";

import {
  effectivePhaseOrder,
  graderStepLabel,
  graderStepState,
  type GraderScanPhase,
  type GraderScanSignals,
} from "@/lib/marketing/audit-grader-phases";
import { marketingCopy } from "@/lib/marketing/copy";

function StepIcon({ state }: { state: "done" | "active" | "pending" }) {
  if (state === "done") {
    return (
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-ink)] text-xs text-white"
        aria-hidden
      >
        ✓
      </span>
    );
  }
  if (state === "active") {
    return (
      <span
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-accent)] border-t-transparent"
        aria-hidden
      >
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
      </span>
    );
  }
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-soft)]"
      aria-hidden
    />
  );
}

/** Owner grader.owner.com — left checklist during scan. */
export function AuditScanningSidebar({
  phase,
  signals,
  restaurantName,
  websiteHost,
  progressPct,
  secondsRemaining,
}: {
  phase: GraderScanPhase;
  signals: GraderScanSignals;
  restaurantName: string;
  websiteHost: string;
  progressPct: number;
  secondsRemaining: number;
}) {
  const order = effectivePhaseOrder(signals);
  const pct = Math.min(100, Math.max(0, progressPct));

  return (
    <aside className="flex h-full min-h-[420px] flex-col border-r border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-5 py-8 md:min-h-[520px] md:px-8 md:py-10">
      <h2 className="type-title-md font-semibold text-[var(--color-ink)]">{marketingCopy.scanning.headline}</h2>

      <ol className="mt-8 flex flex-1 flex-col gap-4">
        {order.map((step) => {
          const state = graderStepState(step, phase, signals);
          const label = graderStepLabel(step, restaurantName, websiteHost);
          return (
            <li
              key={step}
              className={`flex items-start gap-3 text-sm leading-snug ${
                state === "pending" ? "text-[var(--color-muted-medium)]" : "text-[var(--color-ink)]"
              }`}
            >
              <StepIcon state={state} />
              <span className={state === "active" ? "font-medium" : undefined}>{label}</span>
            </li>
          );
        })}
      </ol>

      <div className="mt-auto pt-8">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-muted-faint)]">
          <div
            className="h-full bg-[var(--color-ink)] transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="type-caption mt-3 flex items-center gap-2 text-[var(--color-muted-medium)]">
          <span
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-accent)] border-t-transparent"
            aria-hidden
          >
            <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
          </span>
          {secondsRemaining > 0 ? `${secondsRemaining} seconds remaining` : "Finishing up…"}
        </p>
      </div>
    </aside>
  );
}
