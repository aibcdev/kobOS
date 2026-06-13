"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { DashboardAccountMenu } from "@/components/dashboard/DashboardAccountMenu";
import { appPillActive, appPillInactive } from "@/lib/app-ui-classes";

export type DashboardRestaurantLite = { id: string; name: string; city: string | null };

/** What restaurant owners use day to day */
const NAV_PRIMARY: { href: string; label: string }[] = [
  { href: "/dashboard", label: "Today" },
  { href: "/dashboard/chat", label: "Chat" },
  { href: "/dashboard/reviews", label: "Reviews" },
  { href: "/dashboard/content", label: "Posts & Email" },
  { href: "/dashboard/customers", label: "Customers" },
  { href: "/dashboard/analytics", label: "Traffic & Sales" },
  { href: "/dashboard/website", label: "Website" },
  { href: "/dashboard/settings", label: "Settings" },
];

/** Secondary tools — still useful, not daily */
const NAV_MORE: { href: string; label: string }[] = [
  { href: "/dashboard/brand", label: "Brand & Photos" },
  { href: "/dashboard/seo", label: "Search (SEO)" },
  { href: "/dashboard/workspace", label: "Workspace" },
  { href: "/dashboard/billing", label: "Billing" },
];

/** Internal KOB sales ops only — not for restaurant owners */
const NAV_INTERNAL: { href: string; label: string }[] = [
  { href: "/dashboard/outbound", label: "Sales pipeline" },
];

function withRestaurant(path: string, restaurantId: string | null) {
  if (!restaurantId) return path;
  const clean = path.split("?")[0] ?? path;
  return `${clean}?r=${encodeURIComponent(restaurantId)}`;
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/dashboard/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardShell({
  restaurants,
  userEmail,
  salesMode,
  children,
}: {
  restaurants: DashboardRestaurantLite[];
  userEmail?: string | null;
  salesMode?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeR = searchParams.get("r");
  const restaurantId =
    activeR && restaurants.some((x) => x.id === activeR) ? activeR : restaurants[0]?.id ?? null;

  const [mobileNav, setMobileNav] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const navMore = salesMode ? [...NAV_MORE, ...NAV_INTERNAL] : NAV_MORE;
  const navAll = [...NAV_PRIMARY, ...navMore];

  function submitSearch() {
    const q = searchQuery.trim();
    if (!q || !restaurantId) return;
    router.push(`/dashboard/workspace?r=${encodeURIComponent(restaurantId)}&q=${encodeURIComponent(q)}`);
    setSearchQuery("");
    searchRef.current?.blur();
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-surface-soft)] text-[var(--color-body)]">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-[var(--color-hairline)] bg-[var(--color-surface-soft)] lg:flex">
        <div className="p-4">
          <Link
            href={withRestaurant("/dashboard", restaurantId)}
            className="type-label-md font-semibold text-[var(--color-ink)] no-underline"
          >
            KOB
          </Link>
          <p className="type-caption mt-1 text-[var(--color-muted-medium)]">Your restaurant</p>
          <div className="mt-3">
            <input
              ref={searchRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitSearch();
              }}
              placeholder="Search…"
              className="w-full rounded-[var(--radius-default)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-2.5 py-1.5 text-xs text-[var(--color-body)] outline-none placeholder:text-[var(--color-muted)] focus:border-[var(--color-ink)]"
              aria-label="Search dashboard"
            />
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-2 pb-6">
          {NAV_PRIMARY.map((item) => {
            const target = withRestaurant(item.href, restaurantId);
            const active = isActive(pathname, item.href);
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
          <p className="type-caption mb-1 mt-4 px-3 text-[var(--color-muted-medium)]">More</p>
          {navMore.map((item) => {
            const target = withRestaurant(item.href, restaurantId);
            const active = isActive(pathname, item.href);
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
              <Link href={withRestaurant("/dashboard", restaurantId)} className="type-label-md text-[var(--color-ink)] no-underline">
                KOB
              </Link>
            </div>
            <div className="hidden min-w-0 flex-1 lg:block" />
            <DashboardAccountMenu email={userEmail} />
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
            <p className="type-caption text-[var(--color-muted-medium)]">Add a restaurant to get started.</p>
          )}
        </header>

        {mobileNav ? (
          <div className="border-b border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-2 py-3 lg:hidden">
            <nav className="flex flex-col gap-0.5">
              {navAll.map((item) => {
                const target = withRestaurant(item.href, restaurantId);
                const active = isActive(pathname, item.href);
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
        <div className="pointer-events-none fixed bottom-6 right-6 z-40 sm:bottom-8 sm:right-8">
          <Link
            href={withRestaurant("/dashboard/chat", restaurantId)}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-4 py-3 text-sm font-medium text-[var(--color-text-warm)] shadow-lg no-underline transition-transform active:scale-95"
          >
            Ask Chief of Staff
          </Link>
        </div>
      ) : null}
    </div>
  );
}
