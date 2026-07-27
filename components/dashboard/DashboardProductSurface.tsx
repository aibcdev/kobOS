import { appCardSurface } from "@/lib/app-ui-classes";
import { RequestServiceButton } from "@/components/dashboard/RequestServiceButton";

/** Shared product surface for Owner-mapped modules (live or requestable). */
export function DashboardProductSurface({
  title,
  eyebrow,
  description,
  restaurantName,
  restaurantId,
  status = "live",
  bullets,
  serviceType,
  creditCost = 15,
  isPaid = false,
  openStatus,
  ctaLabel,
}: {
  title: string;
  eyebrow?: string;
  description: string;
  restaurantName?: string;
  restaurantId?: string | null;
  status?: "live" | "waitlist" | "request";
  bullets?: string[];
  /** When set with status=request, one-click creates a ServiceRequest. */
  serviceType?: string;
  creditCost?: number;
  isPaid?: boolean;
  openStatus?: string | null;
  ctaLabel?: string;
}) {
  const billingHref = restaurantId
    ? `/dashboard/billing?r=${encodeURIComponent(restaurantId)}&tier=starter`
    : "/dashboard/billing?tier=starter";

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
        {openStatus === "REQUESTED" || openStatus === "IN_PROGRESS" ? (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
            {openStatus === "IN_PROGRESS" ? "In progress" : "Requested"}
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
            Request this work and our team will pick it up like an order ticket.
          </p>
        )}

        {status === "request" && restaurantId && serviceType ? (
          <div className="mt-6">
            <RequestServiceButton
              restaurantId={restaurantId}
              type={serviceType}
              title={title}
              creditCost={creditCost}
              isPaid={isPaid}
              billingHref={billingHref}
              openStatus={openStatus}
              label={ctaLabel}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
