"use client";

import type { ScanPreviewReview } from "@/lib/marketing/audit-scan-preview";

const FALLBACK_REVIEWS: (ScanPreviewReview & { displayName: string })[] = [
  { displayName: "Sarah M.", text: "Great atmosphere and friendly staff. Food was excellent.", rating: 5, authorInitial: "S" },
  { displayName: "James T.", text: "Waited a bit long but worth it. Would come back.", rating: 4, authorInitial: "J" },
  { displayName: "Priya K.", text: "Lovely spot for a date night. Menu had great options.", rating: 5, authorInitial: "P" },
  { displayName: "Alex R.", text: "Solid lunch spot near the office.", rating: 4, authorInitial: "A" },
];

type ReviewRow = ScanPreviewReview & { displayName: string };

function toRows(reviews: ScanPreviewReview[] | undefined): ReviewRow[] {
  if (!reviews?.length) return FALLBACK_REVIEWS;
  return reviews.map((r, i) => ({
    ...r,
    displayName: `Guest ${r.authorInitial}${i + 1}`,
  }));
}

/** Owner grader — scrolling review cards with green scan line. */
export function AuditScanningReviewsScroll({ reviews }: { reviews?: ScanPreviewReview[] }) {
  const rows = toRows(reviews);
  const duplicated = [...rows, ...rows];

  return (
    <div className="relative mx-auto h-[min(420px,55vh)] w-full max-w-md overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] shadow-[var(--shadow-card-elevated)]">
      <div className="grader-reviews-track flex flex-col gap-3 p-4">
        {duplicated.map((r, i) => (
          <article
            key={`${r.authorInitial}-${i}`}
            className="shrink-0 rounded-[var(--radius-default)] border border-[var(--color-hairline)] bg-white p-4"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-beige)] text-xs font-semibold">
                {r.authorInitial}
              </span>
              <div>
                <p className="type-label-md">{r.displayName}</p>
                <p className="text-xs text-[var(--color-warning)]" aria-hidden>
                  {"★".repeat(Math.min(5, Math.max(1, r.rating)))}
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
