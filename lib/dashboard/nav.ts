/**
 * Owner-facing dashboard nav — max 5 primary items + More.
 * Everything else is progressive disclosure under More / Account.
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
  href: string;
  label: string;
  icon: DashboardNavIcon;
  /** Soft badge e.g. Waitlist */
  badge?: string;
};

export type DashboardNavGroup = {
  id: string;
  label: string | null;
  items: DashboardNavItem[];
  /** Collapsible “More” group — secondary tools */
  collapsible?: boolean;
};

/** Primary owner navigation (≤5) + More + Account. */
export const DASHBOARD_NAV_GROUPS: DashboardNavGroup[] = [
  {
    id: "primary",
    label: null,
    items: [
      { href: "/dashboard", label: "Today", icon: "home" },
      { href: "/dashboard/demand-engine", label: "Demand", icon: "demand" },
      { href: "/dashboard/reviews", label: "Reviews", icon: "reviews" },
      { href: "/dashboard/listings", label: "Google", icon: "listings" },
      { href: "/dashboard/website", label: "Website", icon: "website" },
    ],
  },
  {
    id: "more",
    label: "More",
    collapsible: true,
    items: [
      { href: "/dashboard/content", label: "Social", icon: "content" },
      { href: "/dashboard/ordering", label: "Ordering", icon: "ordering" },
      { href: "/dashboard/customers", label: "Loyalty", icon: "customers" },
      { href: "/dashboard/seo", label: "Local SEO", icon: "seo" },
      { href: "/dashboard/menu", label: "Menu", icon: "menu" },
      { href: "/dashboard/brand", label: "Brand & photos", icon: "brand" },
      { href: "/dashboard/upsells", label: "Upsells", icon: "upsells" },
      { href: "/dashboard/creative", label: "Email & SMS", icon: "creative" },
      { href: "/dashboard/analytics", label: "Insights", icon: "analytics" },
      { href: "/dashboard/chat", label: "Ask anything", icon: "chat" },
      { href: "/dashboard/requests", label: "Requests", icon: "requests" },
    ],
  },
  {
    id: "account",
    label: null,
    items: [
      { href: "/dashboard/settings", label: "Settings", icon: "settings" },
      { href: "/dashboard/billing", label: "Billing", icon: "billing" },
    ],
  },
];

export const DASHBOARD_NAV_INTERNAL: DashboardNavItem[] = [
  { href: "/dashboard/outbound", label: "Sales pipeline", icon: "outbound" },
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

export function isPathInNavGroup(pathname: string, group: DashboardNavGroup) {
  return group.items.some((item) => isDashboardNavActive(pathname, item.href));
}
