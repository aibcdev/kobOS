import Link from "next/link";
import { ownerContainer, ownerNavHeight } from "@/lib/marketing/owner-ui-classes";

/** grader.owner.com — logo + Log in only (optional trial pill when report unlocked). */
export function AuditGraderHeader({
  showTrialCta = false,
  trialHref = "/pricing",
  trialLabel = "Start 7-day free trial",
}: {
  showTrialCta?: boolean;
  trialHref?: string;
  trialLabel?: string;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border-soft)] bg-[var(--color-surface-soft)]">
      <div className={`${ownerContainer} flex ${ownerNavHeight} items-center justify-between`}>
        <Link href="/" className="type-title-sm text-[var(--color-ink)] no-underline">
          KOB
        </Link>
        <div className="flex items-center gap-3">
          {showTrialCta ? (
            <Link
              href={trialHref}
              className="type-button hidden rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-5 py-2.5 text-[var(--color-on-primary)] no-underline sm:inline-flex"
            >
              {trialLabel}
            </Link>
          ) : null}
          <Link
            href="/login"
            className="type-button inline-flex min-h-10 items-center justify-center rounded-[var(--radius-pill)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-5 py-2 text-[var(--color-ink)] no-underline transition-colors hover:bg-[var(--color-surface-warm)]"
          >
            Log in
          </Link>
        </div>
      </div>
    </header>
  );
}
