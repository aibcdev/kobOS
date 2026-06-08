import Link from "next/link";
import { ownerBtnPrimary, ownerBtnSecondary } from "@/lib/marketing/owner-ui-classes";
import { marketingCopy } from "@/lib/marketing/copy";

const BULLETS = marketingCopy.auditUpgrade.bullets;

export function AuditUpgradePanel({
  auditId,
  restaurantName,
  leadEmail,
  primaryHref,
  primaryLabel = "Start 7-day free trial",
}: {
  auditId: string;
  restaurantName: string;
  leadEmail?: string | null;
  primaryHref?: string;
  primaryLabel?: string;
}) {
  const trialHref = primaryHref ?? `/audit/${auditId}/upgrade`;
  const loginHref = `/login?email=${encodeURIComponent(leadEmail ?? "")}&next=${encodeURIComponent(`/audit/${auditId}/upgrade/checkout`)}`;

  return (
    <section className="mt-16 rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-gradient-to-br from-[var(--color-surface-cream)] to-[var(--color-surface-soft)] p-8 shadow-[var(--shadow-card-elevated)] md:p-10">
      <p className="type-caption font-medium uppercase tracking-wide text-[var(--color-primary)]">Next step</p>
      <h2 className="type-title-md mt-2 md:text-[1.75rem]">Put {restaurantName} on autopilot</h2>
      <p className="type-body-md mt-3 max-w-xl leading-relaxed text-[var(--color-muted)]">
        You unlocked the full audit. Start your 7-day free trial to turn these fixes into a weekly growth plan in your
        dashboard.
      </p>
      <ul className="mt-6 space-y-2">
        {BULLETS.map((b) => (
          <li key={b} className="type-body-sm flex items-start gap-2 text-[var(--color-ink)]">
            <span className="mt-0.5 text-[var(--color-accent)]" aria-hidden>
              ✓
            </span>
            {b}
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link href={trialHref} className={ownerBtnPrimary}>
          {primaryLabel}
        </Link>
        <Link href={loginHref} className={ownerBtnSecondary}>
          I already have an account
        </Link>
        <Link
          href="/pricing"
          className="type-body-sm inline-flex min-h-12 items-center justify-center px-2 text-[var(--color-muted)] underline underline-offset-2"
        >
          View pricing
        </Link>
      </div>
    </section>
  );
}
