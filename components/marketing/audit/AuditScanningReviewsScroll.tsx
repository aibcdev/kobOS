"use client";

const MOCK_REVIEWS = [
  { name: "Sarah M.", text: "Great atmosphere and friendly staff. Food was excellent.", stars: 5 },
  { name: "James T.", text: "Waited a bit long but worth it. Would come back.", stars: 4 },
  { name: "Priya K.", text: "Lovely spot for a date night. Menu had great options.", stars: 5 },
  { name: "Alex R.", text: "Solid lunch spot near the office.", stars: 4 },
] as const;

/** Owner grader — scrolling review cards with green scan line. */
export function AuditScanningReviewsScroll() {
  return (
    <div className="relative mx-auto h-[min(420px,55vh)] w-full max-w-md overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] shadow-[var(--shadow-card-elevated)]">
      <div className="grader-reviews-track flex flex-col gap-3 p-4">
        {[...MOCK_REVIEWS, ...MOCK_REVIEWS].map((r, i) => (
          <article
            key={`${r.name}-${i}`}
            className="shrink-0 rounded-[var(--radius-default)] border border-[var(--color-hairline)] bg-white p-4"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-beige)] text-xs font-semibold">
                {r.name[0]}
              </span>
              <div>
                <p className="type-label-md">{r.name}</p>
                <p className="text-xs text-[var(--color-warning)]" aria-hidden>
                  {"★".repeat(r.stars)}
                </p>
              </div>
            </div>
            <p className="type-body-sm mt-2 leading-relaxed text-[var(--color-muted)]">{r.text}</p>
          </article>
        ))}
      </div>
      <div
        className="grader-laser-line pointer-events-none absolute inset-x-4 h-0.5 bg-[var(--color-accent)] shadow-[0_0_10px_rgba(8,137,36,0.5)]"
        style={{ top: "42%" }}
        aria-hidden
      />
    </div>
  );
}
