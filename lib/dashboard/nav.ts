/**
 * Owner.com-style dashboard navigation — outcome groups, not flat tool lists.
 * Maps KOB surfaces onto discovery / sales / repeat / workspace.
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

/** Primary owner-facing groups (Owner.com IA mapped to KOB). */
export const DASHBOARD_NAV_GROUPS: DashboardNavGroup[] = [
  {
    id: "home",
    label: null,
    items: [
      { href: "/dashboard", label: "Today", icon: "home" },
      { href: "/dashboard/chat", label: "Chat", icon: "chat" },
      { href: "/dashboard/requests", label: "Requests", icon: "requests" },
    ],
  },
  {
    id: "discovery",
    label: "Grow online discovery",
    items: [
      { href: "/dashboard/website", label: "Restaurant Website", icon: "website" },
      { href: "/dashboard/seo", label: "Restaurant SEO", icon: "seo" },
      { href: "/dashboard/menu", label: "Online Menu", icon: "menu" },
      { href: "/dashboard/reviews", label: "Reviews Engine", icon: "reviews" },
      { href: "/dashboard/listings", label: "Listings Management", icon: "listings" },
    ],
  },
  {
    id: "sales",
    label: "Grow online sales",
    items: [
      { href: "/dashboard/ordering", label: "Online Ordering", icon: "ordering" },
      { href: "/dashboard/upsells", label: "Smart Upsells", icon: "upsells" },
      { href: "/dashboard/delivery", label: "Delivery", icon: "delivery" },
      { href: "/dashboard/catering", label: "Catering", icon: "catering" },
      {
        href: "/dashboard/phone-ordering",
        label: "AI Phone Ordering",
        icon: "phone",
        badge: "Waitlist",
      },
    ],
  },
  {
    id: "repeat",
    label: "Grow repeat visits",
    items: [
      { href: "/dashboard/content", label: "Posts & Email", icon: "content" },
      { href: "/dashboard/customers", label: "Customers", icon: "customers" },
      { href: "/dashboard/brand", label: "Brand & Photos", icon: "brand" },
      { href: "/dashboard/creative", label: "Creative drafts", icon: "creative" },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
      { href: "/dashboard/analytics", label: "Traffic & Sales", icon: "analytics" },
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
