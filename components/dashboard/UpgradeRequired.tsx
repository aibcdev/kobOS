import Link from "next/link";
import type { SubscriptionPlan } from "@prisma/client";
import { appBtnPrimary, appCardSurface } from "@/lib/app-ui-classes";
import { planLabel } from "@/lib/billing/plan-access";

export function UpgradeRequired({
  restaurantId,
  title,
  description,
  requiredPlan,
}: {
  restaurantId: string;
  title: string;
  description: string;
  requiredPlan: SubscriptionPlan;
}) {
  const billingHref = `/dashboard/billing?r=${encodeURIComponent(restaurantId)}`;
  return (
    <div className={`${appCardSurface} mx-auto max-w-xl`}>
      <h2 className="type-title-sm">{title}</h2>
      <p className="type-body-sm mt-3 text-[var(--color-muted)]">{description}</p>
      <p className="type-caption mt-4 text-[var(--color-muted-medium)]">
        Required plan: <span className="font-semibold text-[var(--color-ink)]">{planLabel(requiredPlan)}</span> or
        higher.
      </p>
      <Link href={billingHref} className={`${appBtnPrimary} mt-6 inline-block no-underline`}>
        View plans &amp; billing
      </Link>
    </div>
  );
}
