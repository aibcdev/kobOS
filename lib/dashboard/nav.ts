/**
 * Owner-facing dashboard nav — grouped by the outcome the owner wants
 * (more customers, more revenue, run it, understand it) rather than by feature.
 * Settings / Billing live in the account menu, not the sidebar.
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
};

export type DashboardNavGroup = {
  id: string;
  label: string | null;
  items: DashboardNavItem[];
};

export const DASHBOARD_NAV_GROUPS: DashboardNavGroup[] = [
  {
    id: "today",
    label: null,
    items: [{ id: "today", href: "/dashboard", label: "Today", icon: "home" }],
  },
  {
    id: "acquire",
    label: "Get more customers",
    items: [
      { id: "demand", href: "/dashboard/demand-engine", label: "Demand Engine", icon: "demand" },
      { id: "listings", href: "/dashboard/listings", label: "Google Presence", icon: "listings" },
      { id: "website", href: "/dashboard/website", label: "Website", icon: "website" },
      { id: "reviews", href: "/dashboard/reviews", label: "Reviews", icon: "reviews" },
      { id: "seo", href: "/dashboard/seo", label: "Local SEO", icon: "seo" },
      { id: "social", href: "/dashboard/content", label: "Social Media", icon: "content" },
    ],
  },
  {
    id: "revenue",
    label: "Increase revenue",
    items: [
      { id: "ordering", href: "/dashboard/ordering", label: "Online Ordering", icon: "ordering" },
      { id: "upsells", href: "/dashboard/upsells", label: "Upsells", icon: "upsells" },
      { id: "loyalty", href: "/dashboard/marketing", label: "Loyalty & recovery", icon: "customers" },
      { id: "email-sms", href: "/dashboard/creative", label: "Email & SMS", icon: "creative" },
    ],
  },
  {
    id: "manage",
    label: "Manage & grow",
    items: [
      { id: "chat", href: "/dashboard/chat", label: "Ask anything", icon: "chat" },
      { id: "requests", href: "/dashboard/requests", label: "Requests", icon: "requests" },
      { id: "performance", href: "/dashboard/analytics", label: "Analyse performance", icon: "analytics" },
    ],
  },
  {
    id: "insights",
    label: "Insights",
    items: [
      { id: "customer-trends", href: "/dashboard/customers", label: "Customer trends", icon: "customers" },
      { id: "menu", href: "/dashboard/menu", label: "Online menu", icon: "menu" },
      { id: "brand", href: "/dashboard/brand", label: "Brand & photos", icon: "brand" },
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

/**
 * Which single nav entry should read as active. Hrefs can repeat across groups,
 * so we pick the deepest match and break ties on document order.
 */
export function resolveActiveNavId(groups: DashboardNavGroup[], pathname: string): string | null {
  let best: { id: string; depth: number } | null = null;
  for (const item of flattenDashboardNav(groups)) {
    if (!isDashboardNavActive(pathname, item.href)) continue;
    const depth = item.href.length;
    if (!best || depth > best.depth) best = { id: item.id, depth };
  }
  return best?.id ?? null;
}
