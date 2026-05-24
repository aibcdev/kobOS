import type { ReactNode } from "react";
import Link from "next/link";

export function AuditResultsShell({
  restaurantName,
  children,
}: {
  restaurantName: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-surface-cream)] pb-24">
      <div className="sticky top-20 z-30 border-b border-[var(--color-hairline)] bg-[var(--color-surface-cream)]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4 md:px-8">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-primary)]">
              AI visibility report
            </p>
            <p className="truncate font-head text-lg font-semibold text-[var(--color-ink)]">{restaurantName}</p>
          </div>
          <Link
            href="/audit"
            className="shrink-0 text-sm font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
          >
            New scan
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}
