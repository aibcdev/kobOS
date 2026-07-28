"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardAccountMenu } from "@/components/dashboard/DashboardAccountMenu";
import { DashboardNavIconGlyph } from "@/components/dashboard/DashboardNavIcon";
import {
  DASHBOARD_NAV_GROUPS,
  DASHBOARD_NAV_INTERNAL,
  resolveActiveNavId,
  withRestaurantQuery,
  type DashboardNavGroup,
  type DashboardNavItem,
} from "@/lib/dashboard/nav";

export type DashboardRestaurantLite = {
  id: string;
  name: string;
  city: string | null;
  logo?: string | null;
  /** Open service requests — drives the header bell count. */
  openRequests?: number;
};

function NavLink({
  item,
  restaurantId,
  active,
  onNavigate,
}: {
  item: DashboardNavItem;
  restaurantId: string | null;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={withRestaurantQuery(item.href, restaurantId)}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
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
  activeId,
  onNavigate,
}: {
  groups: DashboardNavGroup[];
  restaurantId: string | null;
  activeId: string | null;
  onNavigate?: () => void;
}) {
  return (
    <>
      {groups.map((group) => (
        <div key={group.id} className={group.label ? "mt-5" : ""}>
          {group.label ? (
            <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-medium)]">
              {group.label}
            </p>
          ) : null}
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <NavLink
                key={item.id}
                item={item}
                restaurantId={restaurantId}
                active={item.id === activeId}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function RestaurantMonogram({ name, logo }: { name: string; logo?: string | null }) {
  if (logo) {
    return (
      // Owner-uploaded logos come from arbitrary hosts — plain img avoids remote-pattern config.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt=""
        className="h-11 w-11 shrink-0 rounded-lg object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-sm font-semibold text-[var(--color-primary)]">
      {name.trim().slice(0, 1).toUpperCase() || "K"}
    </span>
  );
}

function RestaurantSwitcher({
  restaurants,
  active,
  pathname,
}: {
  restaurants: DashboardRestaurantLite[];
  active: DashboardRestaurantLite;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const multiple = restaurants.length > 1;

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div ref={ref} className="relative mt-3">
      <button
        type="button"
        disabled={!multiple}
        aria-expanded={multiple ? open : undefined}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-cream)]/80 px-3 py-2.5 text-left disabled:cursor-default"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted-medium)]">
            Your restaurant
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-[var(--color-ink)]">{active.name}</p>
        </div>
        <RestaurantMonogram name={active.name} logo={active.logo} />
        {multiple ? (
          <span className="shrink-0 text-[10px] text-[var(--color-muted-medium)]">{open ? "▲" : "▼"}</span>
        ) : null}
      </button>
      {open && multiple ? (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-xl border border-[var(--color-hairline)] bg-white shadow-lg">
          {restaurants.map((r) => (
            <Link
              key={r.id}
              href={withRestaurantQuery(pathname || "/dashboard", r.id)}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 text-[13px] no-underline hover:bg-[var(--color-surface-warm)] ${
                r.id === active.id ? "font-medium text-[var(--color-primary)]" : "text-[var(--color-ink)]"
              }`}
            >
              <span className="min-w-0 flex-1 truncate">{r.name}</span>
              {r.city ? (
                <span className="shrink-0 text-[11px] text-[var(--color-muted-medium)]">{r.city}</span>
              ) : null}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function NotificationBell({ href, count }: { href: string; count: number }) {
  return (
    <Link
      href={href}
      aria-label={count > 0 ? `${count} open requests` : "Requests"}
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-muted)] no-underline hover:bg-white hover:text-[var(--color-ink)]"
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden>
        <path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 3 .7 4.4 1.5 5.5H5c.8-1.1 1.5-2.5 1.5-5.5Z" />
        <path d="M10 18.5a2 2 0 0 0 4 0" />
      </svg>
      {count > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[10px] font-semibold text-white">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
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
  const activeRestaurant = restaurants.find((r) => r.id === restaurantId) ?? restaurants[0] ?? null;

  const [mobileNav, setMobileNav] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const groups = useMemo(() => {
    if (!salesMode) return DASHBOARD_NAV_GROUPS;
    return [...DASHBOARD_NAV_GROUPS, { id: "internal", label: "Internal", items: DASHBOARD_NAV_INTERNAL }];
  }, [salesMode]);

  const activeId = useMemo(() => resolveActiveNavId(groups, pathname), [groups, pathname]);

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
            className="font-head text-xl font-semibold tracking-tight text-[var(--color-primary)] no-underline"
          >
            KOB
          </Link>
          {activeRestaurant ? (
            <RestaurantSwitcher
              restaurants={restaurants}
              active={activeRestaurant}
              pathname={pathname}
            />
          ) : (
            <p className="mt-2 text-xs text-[var(--color-muted-medium)]">Add a restaurant to get started</p>
          )}
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
        <nav className="flex flex-1 flex-col overflow-y-auto px-2 pb-4">
          <NavGroups groups={groups} restaurantId={restaurantId} activeId={activeId} />
        </nav>
        <div className="mt-auto border-t border-[var(--color-hairline)] p-4">
          <div className="rounded-xl bg-[#f7f5f2] px-3 py-3">
            <p className="text-sm font-medium text-[var(--color-ink)]">Get more customers, every week.</p>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              Invite your team and unlock more tools.
            </p>
            <Link
              href={withRestaurantQuery("/dashboard/settings", restaurantId)}
              className="mt-2.5 inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-[var(--color-ink)] no-underline ring-1 ring-[var(--color-hairline)]"
            >
              <DashboardNavIconGlyph icon="customers" className="h-3.5 w-3.5" />
              Invite team
            </Link>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[var(--color-hairline)] bg-[#f7f5f2]/95 px-4 py-3 backdrop-blur">
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
          <div className="flex shrink-0 items-center gap-1.5">
            <DashboardAccountMenu email={userEmail} restaurantId={restaurantId} />
            <Link
              href="/resources"
              className="hidden items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium text-[var(--color-muted)] no-underline hover:bg-white hover:text-[var(--color-ink)] sm:flex"
            >
              <span aria-hidden>?</span> Help
            </Link>
            <NotificationBell
              href={withRestaurantQuery("/dashboard/requests", restaurantId)}
              count={activeRestaurant?.openRequests ?? 0}
            />
          </div>
        </header>

        {mobileNav ? (
          <div className="max-h-[70vh] overflow-y-auto border-b border-[var(--color-hairline)] bg-white px-2 py-3 lg:hidden">
            {restaurants.length > 1 ? (
              <div className="mb-3 border-b border-[var(--color-hairline)] pb-3">
                <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-medium)]">
                  Your restaurants
                </p>
                <div className="flex flex-col gap-0.5">
                  {restaurants.map((r) => (
                    <Link
                      key={r.id}
                      href={withRestaurantQuery(pathname || "/dashboard", r.id)}
                      onClick={() => setMobileNav(false)}
                      className={`truncate rounded-xl px-2.5 py-2 text-[13px] no-underline ${
                        r.id === restaurantId
                          ? "bg-[var(--color-muted-faint)] font-medium text-[var(--color-primary)]"
                          : "text-[var(--color-ink)]/80"
                      }`}
                    >
                      {r.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
            <nav>
              <NavGroups
                groups={groups}
                restaurantId={restaurantId}
                activeId={activeId}
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
            Ask KOB
          </Link>
        </div>
      ) : null}
    </div>
  );
}
