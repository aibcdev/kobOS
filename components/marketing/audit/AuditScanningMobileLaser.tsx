"use client";

/** Owner grader — phone outline with moving green scan line. */
export function AuditScanningMobileLaser() {
  return (
    <div className="mx-auto flex w-full max-w-[280px] flex-col items-center">
      <div className="relative w-[220px] rounded-[2rem] border-[3px] border-[var(--color-ink)] bg-[var(--color-surface-warm)] p-3 shadow-[var(--shadow-card-elevated)]">
        <div className="overflow-hidden rounded-[1.35rem] bg-white">
          <div className="flex items-center justify-between px-3 py-2 text-[10px] text-[var(--color-muted-medium)]">
            <span>9:41</span>
            <span aria-hidden>▮▮ ⌁ ▮</span>
          </div>
          <div className="relative h-[320px] overflow-hidden bg-gradient-to-b from-[var(--color-surface-cream)] to-white">
            <div className="space-y-3 p-4 opacity-60">
              <div className="h-4 w-3/4 rounded bg-[var(--color-muted-faint)]" />
              <div className="h-24 w-full rounded-lg bg-[var(--color-muted-faint)]" />
              <div className="h-3 w-full rounded bg-[var(--color-muted-faint)]" />
              <div className="h-3 w-5/6 rounded bg-[var(--color-muted-faint)]" />
            </div>
            <div
              className="grader-laser-line pointer-events-none absolute inset-x-0 h-1 bg-[var(--color-accent)] shadow-[0_0_12px_2px_rgba(8,137,36,0.55)]"
              aria-hidden
            />
          </div>
        </div>
      </div>
    </div>
  );
}
