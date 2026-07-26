import Link from "next/link";

import { isDashboardNavActive, withRestaurantQuery } from "@/lib/dashboard/nav";

const TABS = [
  { href: "/dashboard/demand-engine", label: "Overview" },
  { href: "/dashboard/demand-engine/recommended", label: "Recommended" },
  { href: "/dashboard/demand-engine/live", label: "Live" },
  { href: "/dashboard/demand-engine/performance", label: "Performance" },
] as const;

export function DemandEngineSubnav({
  restaurantId,
  pathname,
}: {
  restaurantId: string;
  pathname: string;
}) {
  return (
    <nav className="mt-6 flex flex-wrap gap-2 border-b border-[var(--color-hairline)] pb-3">
      {TABS.map((tab) => {
        const active = isDashboardNavActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={withRestaurantQuery(tab.href, restaurantId)}
            className={
              active
                ? "rounded-full bg-[var(--color-primary)] px-3.5 py-1.5 text-sm font-semibold text-white"
                : "rounded-full px-3.5 py-1.5 text-sm font-medium text-[var(--color-muted)] hover:bg-[var(--color-muted-faint)] hover:text-[var(--color-ink)]"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
