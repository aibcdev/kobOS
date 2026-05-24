"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { appPillActive, appPillInactive } from "@/lib/app-ui-classes";

export type DashboardRestaurantLite = { id: string; name: string; city: string | null };

const NAV: { href: string; label: string }[] = [
  { href: "/dashboard", label: "Today" },
  { href: "/dashboard/brand", label: "Brand & Visuals" },
  { href: "/dashboard/visuals", label: "Visuals" },
  { href: "/dashboard/website", label: "Website" },
  { href: "/dashboard/redesign", label: "Redesign" },
  { href: "/dashboard/reviews", label: "Reviews" },
  { href: "/dashboard/outbound", label: "Outbound" },
  { href: "/dashboard/growth-agent", label: "Growth Agent" },
  { href: "/dashboard/settings", label: "Settings" },
];

function withRestaurant(path: string, restaurantId: string | null) {
  if (!restaurantId) return path;
  const clean = path.split("?")[0] ?? path;
  return `${clean}?r=${encodeURIComponent(restaurantId)}`;
}

export function DashboardShell({
  restaurants,
  children,
}: {
  restaurants: DashboardRestaurantLite[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeR = searchParams.get("r");
  const restaurantId =
    activeR && restaurants.some((x) => x.id === activeR) ? activeR : restaurants[0]?.id ?? null;

  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--color-surface-soft)] text-[var(--color-body)]">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-[var(--color-hairline)] bg-[var(--color-surface-soft)] lg:flex">
        <div className="p-4">
          <Link href="/" className="type-label-md font-semibold text-[var(--color-ink)] no-underline">
            KOB
          </Link>
          <p className="type-caption mt-1 text-[var(--color-muted-medium)]">Workspace</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-2 pb-6">
          {NAV.map((item) => {
            const target = withRestaurant(item.href, restaurantId);
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard" || pathname === "/dashboard/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={target}
                className={`rounded-[var(--radius-default)] px-3 py-2 text-sm no-underline transition-colors ${
                  active
                    ? "bg-[var(--color-ink)] font-medium text-[var(--color-text-warm)]"
                    : "text-[var(--color-muted)] hover:bg-[var(--color-surface-warm)] hover:text-[var(--color-ink)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex flex-col gap-3 border-b border-[var(--color-hairline)] bg-[var(--color-surface-soft)]/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 lg:hidden">
              <button
                type="button"
                aria-expanded={mobileNav}
                aria-label={mobileNav ? "Close navigation" : "Open navigation"}
                className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-default)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-[var(--color-ink)]"
                onClick={() => setMobileNav((v) => !v)}
              >
                {mobileNav ? "×" : "Menu"}
              </button>
              <span className="type-label-md text-[var(--color-ink)]">KOB</span>
            </div>
            <div className="hidden min-w-0 flex-1 lg:block" />
            <Link
              href="/login"
              className="type-caption shrink-0 text-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-ink)]"
            >
              Account
            </Link>
          </div>
          {restaurants.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {restaurants.map((m) => (
                <Link
                  key={m.id}
                  href={withRestaurant(pathname || "/dashboard", m.id)}
                  className={m.id === restaurantId ? appPillActive : appPillInactive}
                >
                  {m.name}
                </Link>
              ))}
            </div>
          ) : (
            <p className="type-caption text-[var(--color-muted-medium)]">Add a restaurant to unlock modules.</p>
          )}
        </header>

        {mobileNav ? (
          <div className="border-b border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-2 py-3 lg:hidden">
            <nav className="flex flex-col gap-0.5">
              {NAV.map((item) => {
                const target = withRestaurant(item.href, restaurantId);
                const active =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard" || pathname === "/dashboard/"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={target}
                    onClick={() => setMobileNav(false)}
                    className={`rounded-[var(--radius-default)] px-3 py-2.5 text-sm no-underline ${
                      active ? "bg-[var(--color-ink)] text-[var(--color-text-warm)]" : "text-[var(--color-muted)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        ) : null}

        <main className="flex-1">{children}</main>
      </div>

      {restaurantId ? (
        <div className="pointer-events-none fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2 sm:bottom-8 sm:right-8">
          <div className="pointer-events-auto flex flex-col gap-1 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-2 shadow-lg">
            <Link
              href="/audit"
              className="rounded-[var(--radius-default)] px-3 py-2 text-xs font-medium text-[var(--color-ink)] no-underline hover:bg-[var(--color-surface-warm)]"
            >
              Run audit
            </Link>
            <Link
              href={withRestaurant("/dashboard/brand", restaurantId)}
              className="rounded-[var(--radius-default)] px-3 py-2 text-xs font-medium text-[var(--color-ink)] no-underline hover:bg-[var(--color-surface-warm)]"
            >
              Brand &amp; Visuals
            </Link>
            <Link
              href={withRestaurant("/dashboard/growth-agent", restaurantId)}
              className="rounded-[var(--radius-default)] px-3 py-2 text-xs font-medium text-[var(--color-ink)] no-underline hover:bg-[var(--color-surface-warm)]"
            >
              Growth Agent
            </Link>
            <Link
              href={withRestaurant("/dashboard/billing", restaurantId)}
              className="rounded-[var(--radius-default)] px-3 py-2 text-xs font-medium text-[var(--color-ink)] no-underline hover:bg-[var(--color-surface-warm)]"
            >
              Billing
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
