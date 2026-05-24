import Link from "next/link";
import { marketingCopy } from "@/lib/marketing/copy";

/** Full-page message when audit routes cannot reach Postgres (dev/staging). */
export function AuditDbUnavailable() {
  const showDev = process.env.NODE_ENV === "development";

  return (
    <div className="mx-auto max-w-lg px-6 py-20 text-center md:py-28">
      <div className="overflow-hidden rounded-2xl border border-[var(--color-hairline)] bg-white text-left shadow-[0_12px_40px_-16px_rgba(9,68,19,0.12)]">
        <div className="border-b border-[var(--color-hairline)] bg-[var(--color-canvas)]/50 px-6 py-8 text-center">
          <span
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] font-head text-xl font-semibold text-white"
            aria-hidden
          >
            !
          </span>
          <h1 className="font-head text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Report temporarily unavailable
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-pretty text-sm leading-relaxed text-[var(--color-muted)] md:text-base">
            We can&apos;t run scans on this environment right now. Your restaurant details are fine—our database
            connection needs a moment.
          </p>
        </div>
        <div className="flex flex-col gap-3 px-6 py-6 sm:flex-row sm:justify-center">
          <Link
            href="/audit"
            className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--color-primary)] px-6 text-sm font-semibold text-white no-underline hover:bg-[var(--color-accent)]"
          >
            Try again
          </Link>
          <Link
            href="/demo"
            className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-cream)] px-6 text-sm font-medium text-[var(--color-ink)] no-underline hover:bg-[var(--color-surface-warm)]"
          >
            {marketingCopy.cta.freeDemo}
          </Link>
        </div>
        {showDev ? (
          <details className="border-t border-[var(--color-hairline)] bg-[var(--color-surface-warm)]/60 px-6 py-4 text-left">
            <summary className="cursor-pointer text-xs font-medium text-[var(--color-muted-medium)]">
              For developers
            </summary>
            <ul className="mt-3 list-inside list-disc space-y-2 text-xs leading-relaxed text-[var(--color-muted)]">
              <li>Check DATABASE_URL in .env.local (Supabase session pooler URI recommended).</li>
              <li>Resume the project if Supabase paused after idle.</li>
              <li>Run npm run db:migrate then restart npm run dev.</li>
            </ul>
          </details>
        ) : null}
      </div>
      <Link
        href="/"
        className="mt-8 inline-block text-sm font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
      >
        Back to home
      </Link>
    </div>
  );
}
