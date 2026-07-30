/**
 * Owner-facing dashboard nav — six primary destinations.
 * Settings / Billing live in the account menu, not the sidebar.
 * Deep routes stay reachable via Marketing / Reports hubs (and direct URLs).
 */

export type DashboardNavIcon =
  | "home"
  | "chat"
  | "requests"
  | "website"
  | "seo"
  | "menu"
  | "reviews"
  | "listings"
  | "ordering"
  | "upsells"
  | "delivery"
  | "catering"
  | "phone"
  | "content"
  | "customers"
  | "brand"
  | "creative"
  | "analytics"
  | "settings"
  | "billing"
  | "outbound"
  | "demand"
  | "more";

export type DashboardNavItem = {
  /** Stable identity — two entries may legitimately share an href. */
  id: string;
  href: string;
  label: string;
  icon: DashboardNavIcon;
  /** Soft badge e.g. Waitlist */
  badge?: string;
  /**
   * Extra path prefixes that should highlight this item when the current
   * pathname isn't under `href` (e.g. Marketing covers demand-engine).
   */
  activePrefixes?: string[];
};

export type DashboardNavGroup = {
  id: string;
  label: string | null;
  items: DashboardNavItem[];
};

export const DASHBOARD_NAV_GROUPS: DashboardNavGroup[] = [
  {
    id: "primary",
    label: null,
    items: [
      { id: "today", href: "/dashboard", label: "Today", icon: "home" },
      { id: "customers", href: "/dashboard/customers", label: "Customers", icon: "customers" },
      { id: "website", href: "/dashboard/website", label: "Website", icon: "website" },
      { id: "reviews", href: "/dashboard/reviews", label: "Reviews", icon: "reviews" },
      {
        id: "marketing",
        href: "/dashboard/marketing",
        label: "Marketing",
        icon: "demand",
        activePrefixes: [
          "/dashboard/demand-engine",
          "/dashboard/listings",
          "/dashboard/seo",
          "/dashboard/content",
          "/dashboard/creative",
          "/dashboard/ordering",
          "/dashboard/upsells",
        ],
      },
      {
        id: "reports",
        href: "/dashboard/analytics",
        label: "Reports",
        icon: "analytics",
        activePrefixes: ["/dashboard/brand", "/dashboard/menu", "/dashboard/requests"],
      },
    ],
  },
];

/** Shown in the account menu, not the sidebar. */
export const DASHBOARD_NAV_ACCOUNT: DashboardNavItem[] = [
  { id: "settings", href: "/dashboard/settings", label: "Settings", icon: "settings" },
  { id: "billing", href: "/dashboard/billing", label: "Billing", icon: "billing" },
];

export const DASHBOARD_NAV_INTERNAL: DashboardNavItem[] = [
  { id: "outbound", href: "/dashboard/outbound", label: "Sales pipeline", icon: "outbound" },
];

export function flattenDashboardNav(groups: DashboardNavGroup[]): DashboardNavItem[] {
  return groups.flatMap((g) => g.items);
}

export function withRestaurantQuery(path: string, restaurantId: string | null) {
  if (!restaurantId) return path;
  const clean = path.split("?")[0] ?? path;
  return `${clean}?r=${encodeURIComponent(restaurantId)}`;
}

export function isDashboardNavActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/dashboard/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function matchesActivePrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Which single nav entry should read as active. Prefers exact/href matches,
 * then activePrefixes; deepest match wins, ties break on document order.
 */
export function resolveActiveNavId(groups: DashboardNavGroup[], pathname: string): string | null {
  let best: { id: string; depth: number } | null = null;
  for (const item of flattenDashboardNav(groups)) {
    let depth = 0;
    if (isDashboardNavActive(pathname, item.href)) {
      depth = item.href.length;
    } else if (item.activePrefixes?.some((p) => matchesActivePrefix(pathname, p))) {
      const matched = item.activePrefixes
        .filter((p) => matchesActivePrefix(pathname, p))
        .sort((a, b) => b.length - a.length)[0];
      depth = matched?.length ?? 0;
    }
    if (depth === 0) continue;
    if (!best || depth > best.depth) best = { id: item.id, depth };
  }
  return best?.id ?? null;
}
