/**
 * Dashboard navigation — organised around outcomes (customers / revenue),
 * not a flat list of tools. Delivery, catering, and phone ordering are omitted
 * from the primary IA to keep the growth story clear.
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
  | "outbound";

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
};

/** Outcome-led owner navigation. */
export const DASHBOARD_NAV_GROUPS: DashboardNavGroup[] = [
  {
    id: "home",
    label: null,
    items: [{ href: "/dashboard", label: "Today", icon: "home" }],
  },
  {
    id: "customers",
    label: "Get more customers",
    items: [
      { href: "/dashboard/listings", label: "Google Presence", icon: "listings" },
      { href: "/dashboard/website", label: "Website", icon: "website" },
      { href: "/dashboard/reviews", label: "Reviews", icon: "reviews" },
      { href: "/dashboard/seo", label: "Local SEO", icon: "seo" },
      { href: "/dashboard/content", label: "Social Media", icon: "content" },
    ],
  },
  {
    id: "revenue",
    label: "Increase revenue",
    items: [
      { href: "/dashboard/ordering", label: "Online Ordering", icon: "ordering" },
      { href: "/dashboard/upsells", label: "Upsells", icon: "upsells" },
      { href: "/dashboard/customers", label: "Loyalty & recovery", icon: "customers" },
      { href: "/dashboard/creative", label: "Email & SMS", icon: "creative" },
    ],
  },
  {
    id: "chief",
    label: "Chief of Staff",
    items: [
      { href: "/dashboard/chat", label: "Ask anything", icon: "chat" },
      { href: "/dashboard/requests", label: "Create campaigns", icon: "requests" },
      { href: "/dashboard/analytics", label: "Analyse performance", icon: "analytics" },
    ],
  },
  {
    id: "insights",
    label: "Insights",
    items: [
      { href: "/dashboard/customers", label: "Customer trends", icon: "customers" },
      { href: "/dashboard/analytics", label: "Revenue & traffic", icon: "analytics" },
      { href: "/dashboard/menu", label: "Menu", icon: "menu" },
      { href: "/dashboard/brand", label: "Brand & photos", icon: "brand" },
    ],
  },
  {
    id: "account",
    label: "Account",
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
