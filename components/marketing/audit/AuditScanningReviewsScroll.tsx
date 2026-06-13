"use client";

import type { ScanPreviewReview } from "@/lib/marketing/audit-scan-preview";

type ReviewRow = ScanPreviewReview & { displayName: string };

function toRows(reviews: ScanPreviewReview[] | undefined): ReviewRow[] {
  if (!reviews?.length) return [];
  return reviews.map((r, i) => ({
    ...r,
    displayName: `Guest ${r.authorInitial}${i + 1}`,
  }));
}

/** Owner grader — scrolling review cards with green scan line (real Google reviews only). */
export function AuditScanningReviewsScroll({ reviews }: { reviews?: ScanPreviewReview[] }) {
  const rows = toRows(reviews);

  if (rows.length === 0) {
    return (
      <div className="mx-auto flex h-[min(420px,55vh)] w-full max-w-md flex-col items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-8 text-center shadow-[var(--shadow-card-elevated)]">
        <p className="type-body-md font-medium text-[var(--color-ink)]">Checking Google reviews</p>
        <p className="type-body-sm mt-2 text-[var(--color-muted)]">
          We will show guest feedback here when we find a matching Google Business listing.
        </p>
      </div>
    );
  }

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
