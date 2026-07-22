import Link from "next/link";
import { appBtnPrimary, appCardSurface } from "@/lib/app-ui-classes";

/** Shared product surface for Owner-mapped modules (live or waitlist). */
export function DashboardProductSurface({
  title,
  eyebrow,
  description,
  restaurantName,
  restaurantId,
  status = "live",
  bullets,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  eyebrow?: string;
  description: string;
  restaurantName?: string;
  restaurantId?: string | null;
  status?: "live" | "waitlist" | "request";
  bullets?: string[];
  ctaHref?: string;
  ctaLabel?: string;
}) {
  const requestHref = restaurantId
    ? `/dashboard/requests?r=${encodeURIComponent(restaurantId)}`
    : "/dashboard/requests";
  const href =
    ctaHref ??
    (status === "request" || status === "waitlist" ? requestHref : undefined);
  const label =
    ctaLabel ??
    (status === "waitlist"
      ? "Join waitlist via Requests"
      : status === "request"
        ? "Request this with credits"
        : undefined);

  return (
    <div className="mx-auto max-w-3xl px-[var(--spacing-md)] py-10">
      {eyebrow ? (
        <p className="type-caption font-medium tracking-wide text-[var(--color-muted-medium)] uppercase">
          {eyebrow}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="type-title-md text-[var(--color-ink)]">{title}</h1>
        {status === "waitlist" ? (
          <span className="rounded-full bg-[var(--color-muted-faint)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-muted)]">
            Waitlist
          </span>
        ) : null}
      </div>
      <p className="type-body-md mt-2 text-[var(--color-muted)]">
        {description}
        {restaurantName ? ` · ${restaurantName}` : null}
      </p>

      <div className={`mt-8 ${appCardSurface}`}>
        {bullets && bullets.length > 0 ? (
          <ul className="space-y-2 text-sm text-[var(--color-body)]">
            {bullets.map((b) => (
              <li key={b} className="flex gap-2">
                <span className="text-[var(--color-primary)]" aria-hidden>
                  ✓
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="type-body-sm text-[var(--color-muted)]">
            This surface is mapped to Owner.com&apos;s product model. Use Requests to put work in
            motion with credits while we deepen the automation.
          </p>
        )}

        {href && label ? (
          <div className="mt-6">
            <Link href={href} className={appBtnPrimary}>
              {label}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
