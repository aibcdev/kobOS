import Link from "next/link";
import { appBtnPrimary, appLinkMuted } from "@/lib/app-ui-classes";

export function DashboardEmptyRestaurant() {
  return (
    <div className="mx-auto max-w-lg px-[var(--spacing-md)] py-20 text-center">
      <h1 className="type-title-md">Add a restaurant</h1>
      <p className="type-body-md mt-3 text-[var(--color-muted)]">
        This area opens once you have a venue in your workspace.
      </p>
      <Link href="/dashboard" className={`${appBtnPrimary} mt-8 inline-flex`}>
        Go to Today
      </Link>
      <Link href="/" className={`${appLinkMuted} mt-6 block`}>
        Back home
      </Link>
    </div>
  );
}
