export type WorkspaceAppDef = {
  slug: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  countKey?: string;
};

export type WorkspaceAppCategory = {
  id: string;
  title: string;
  color: string;
  apps: WorkspaceAppDef[];
};

/** Aligned with Owner.com outcome groups + KOB workspace. */
export const WORKSPACE_APP_CATEGORIES: WorkspaceAppCategory[] = [
  {
    id: "discovery",
    title: "Grow online discovery",
    color: "#094413",
    apps: [
      { slug: "website", title: "Restaurant Website", description: "Your shop window online", href: "/dashboard/website", icon: "globe" },
      { slug: "seo", title: "Restaurant SEO", description: "Keywords and local visibility", href: "/dashboard/seo", icon: "search", countKey: "keywords" },
      { slug: "menu", title: "Online Menu", description: "Dishes guests can find", href: "/dashboard/menu", icon: "edit" },
      { slug: "reviews", title: "Reviews Engine", description: "Reply and improve ratings", href: "/dashboard/reviews", icon: "star", countKey: "reviewsPending" },
      { slug: "listings", title: "Listings Management", description: "Hours and maps accuracy", href: "/dashboard/listings", icon: "globe" },
    ],
  },
  {
    id: "sales",
    title: "Grow online sales",
    color: "#0d9488",
    apps: [
      { slug: "ordering", title: "Online Ordering", description: "Order on your site", href: "/dashboard/ordering", icon: "cart", countKey: "ordering" },
      { slug: "upsells", title: "Smart Upsells", description: "Grow average ticket", href: "/dashboard/upsells", icon: "chart" },
      { slug: "delivery", title: "Delivery", description: "Aggregator + direct paths", href: "/dashboard/delivery", icon: "cart" },
      { slug: "catering", title: "Catering", description: "Packages and inquiries", href: "/dashboard/catering", icon: "megaphone" },
      { slug: "phone", title: "AI Phone Ordering", description: "Never miss a call", href: "/dashboard/phone-ordering", icon: "bot" },
    ],
  },
  {
    id: "repeat",
    title: "Grow repeat visits",
    color: "#d97706",
    apps: [
      { slug: "content", title: "Posts & Email", description: "Drafts ready to approve", href: "/dashboard/content", icon: "edit", countKey: "content" },
      { slug: "customers", title: "Customers", description: "Guests and themes", href: "/dashboard/customers", icon: "chat", countKey: "reviews" },
      { slug: "brand", title: "Brand & Photos", description: "Look as good as you taste", href: "/dashboard/brand", icon: "image", countKey: "assets" },
      { slug: "creative", title: "Creative drafts", description: "UGC and photo packs", href: "/dashboard/creative", icon: "image" },
      { slug: "requests", title: "Requests", description: "Spend credits on deliverables", href: "/dashboard/requests", icon: "megaphone" },
    ],
  },
  {
    id: "account",
    title: "Account",
    color: "#64748b",
    apps: [
      { slug: "traffic", title: "Traffic & Sales", description: "Visitors and AOV", href: "/dashboard/analytics", icon: "chart", countKey: "traffic" },
      { slug: "chat", title: "Chat", description: "Ask your Chief of Staff", href: "/dashboard/chat", icon: "bot" },
      { slug: "briefing", title: "Today", description: "Morning tasks and brief", href: "/dashboard", icon: "sun", countKey: "insights" },
      { slug: "settings", title: "Settings", description: "Connections and profile", href: "/dashboard/settings", icon: "settings", countKey: "integrations" },
      { slug: "billing", title: "Billing", description: "Plan and invoices", href: "/dashboard/billing", icon: "card" },
    ],
  },
];
