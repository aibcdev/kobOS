"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { DashboardAccountMenu } from "@/components/dashboard/DashboardAccountMenu";
import { DashboardNavIconGlyph } from "@/components/dashboard/DashboardNavIcon";
import { appPillActive, appPillInactive } from "@/lib/app-ui-classes";
import {
  DASHBOARD_NAV_GROUPS,
  DASHBOARD_NAV_INTERNAL,
  isDashboardNavActive,
  withRestaurantQuery,
  type DashboardNavGroup,
  type DashboardNavItem,
} from "@/lib/dashboard/nav";

export type DashboardRestaurantLite = { id: string; name: string; city: string | null };

function NavLink({
  item,
  restaurantId,
  pathname,
  onNavigate,
}: {
  item: DashboardNavItem;
  restaurantId: string | null;
  pathname: string;
  onNavigate?: () => void;
}) {
  const target = withRestaurantQuery(item.href, restaurantId);
  const active = isDashboardNavActive(pathname, item.href);
  return (
    <Link
      href={target}
      onClick={onNavigate}
      className={`group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] no-underline transition-colors ${
        active
          ? "bg-[var(--color-muted-faint)] font-medium text-[var(--color-primary)]"
          : "text-[var(--color-ink)]/80 hover:bg-[var(--color-surface-warm)] hover:text-[var(--color-ink)]"
      }`}
    >
      <span
        className={`shrink-0 ${active ? "text-[var(--color-primary)]" : "text-[var(--color-muted)] group-hover:text-[var(--color-ink)]"}`}
      >
        <DashboardNavIconGlyph icon={item.icon} />
      </span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge ? (
        <span className="shrink-0 rounded-full bg-[var(--color-muted-faint)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-muted)]">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

function NavGroups({
  groups,
  restaurantId,
  pathname,
  onNavigate,
}: {
  groups: DashboardNavGroup[];
  restaurantId: string | null;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {groups.map((group) => (
        <div key={group.id} className={group.label ? "mt-5" : ""}>
          {group.label ? (
            <p className="mb-1.5 px-2.5 text-[11px] font-medium tracking-wide text-[var(--color-muted-medium)]">
              {group.label}
            </p>
          ) : null}
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                restaurantId={restaurantId}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
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

  const groups = useMemo(() => {
    if (!salesMode) return DASHBOARD_NAV_GROUPS;
    return DASHBOARD_NAV_GROUPS.map((g) =>
      g.id === "account" ? { ...g, items: [...g.items, ...DASHBOARD_NAV_INTERNAL] } : g,
    );
  }, [salesMode]);

  function submitSearch() {
    const q = searchQuery.trim();
    if (!q || !restaurantId) return;
    router.push(`/dashboard/workspace?r=${encodeURIComponent(restaurantId)}&q=${encodeURIComponent(q)}`);
    setSearchQuery("");
    searchRef.current?.blur();
  }

  return (
    <div className="flex min-h-screen bg-[#f7f5f2] text-[var(--color-body)]">
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-[var(--color-hairline)] bg-white lg:flex">
        <div className="px-4 pb-3 pt-5">
          <Link
            href={withRestaurantQuery("/dashboard", restaurantId)}
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
              className="w-full rounded-xl border border-[var(--color-hairline)] bg-[#f7f5f2] px-2.5 py-2 text-xs text-[var(--color-body)] outline-none placeholder:text-[var(--color-muted)] focus:border-[var(--color-ink)]"
              aria-label="Search dashboard"
            />
          </div>
        </div>
        <nav className="flex flex-1 flex-col overflow-y-auto px-2 pb-8">
          <NavGroups groups={groups} restaurantId={restaurantId} pathname={pathname} />
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex flex-col gap-3 border-b border-[var(--color-hairline)] bg-[#f7f5f2]/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 lg:hidden">
              <button
                type="button"
                aria-expanded={mobileNav}
                aria-label={mobileNav ? "Close navigation" : "Open navigation"}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-hairline)] bg-white text-[var(--color-ink)]"
                onClick={() => setMobileNav((v) => !v)}
              >
                {mobileNav ? "×" : "Menu"}
              </button>
              <Link
                href={withRestaurantQuery("/dashboard", restaurantId)}
                className="type-label-md text-[var(--color-ink)] no-underline"
              >
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
                  href={withRestaurantQuery(pathname || "/dashboard", m.id)}
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
          <div className="max-h-[70vh] overflow-y-auto border-b border-[var(--color-hairline)] bg-white px-2 py-3 lg:hidden">
            <nav>
              <NavGroups
                groups={groups}
                restaurantId={restaurantId}
                pathname={pathname}
                onNavigate={() => setMobileNav(false)}
              />
            </nav>
          </div>
        ) : null}

        <main className="flex-1">{children}</main>
      </div>

      {restaurantId ? (
        <div className="pointer-events-none fixed bottom-6 right-6 z-40 sm:bottom-8 sm:right-8">
          <Link
            href={withRestaurantQuery("/dashboard/chat", restaurantId)}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-4 py-3 text-sm font-medium text-[var(--color-text-warm)] shadow-lg no-underline transition-transform active:scale-95"
          >
            Ask Chief of Staff
          </Link>
        </div>
      ) : null}
    </div>
  );
}
