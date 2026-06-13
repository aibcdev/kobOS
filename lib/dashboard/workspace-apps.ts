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

export const WORKSPACE_APP_CATEGORIES: WorkspaceAppCategory[] = [
  {
    id: "marketing",
    title: "Marketing & Socials",
    color: "#7c5cfc",
    apps: [
      { slug: "campaigns", title: "Campaigns", description: "Posts, promos, and email", href: "/dashboard/marketing", icon: "megaphone", countKey: "campaigns" },
      { slug: "content", title: "Content", description: "Drafts ready to approve", href: "/dashboard/content", icon: "edit", countKey: "content" },
      { slug: "seo", title: "Search visibility", description: "Keywords and rankings", href: "/dashboard/seo", icon: "search", countKey: "keywords" },
      { slug: "brand", title: "Brand & visuals", description: "Photos, logos, and style", href: "/dashboard/brand", icon: "image", countKey: "assets" },
    ],
  },
  {
    id: "sales",
    title: "Sales & Traffic",
    color: "#0d9488",
    apps: [
      { slug: "traffic", title: "Traffic & Sales", description: "Visitors, orders, and AOV", href: "/dashboard/analytics", icon: "chart", countKey: "traffic" },
      { slug: "ordering", title: "Ordering paths", description: "Book and order buttons", href: "/dashboard/ordering", icon: "cart", countKey: "ordering" },
    ],
  },
  {
    id: "guest",
    title: "Guest voice",
    color: "#d97706",
    apps: [
      { slug: "insights", title: "Customer Insights", description: "Review scores and themes", href: "/dashboard/customers", icon: "chat", countKey: "reviews" },
      { slug: "reviews", title: "Reviews inbox", description: "Reply to guest feedback", href: "/dashboard/reviews", icon: "star", countKey: "reviewsPending" },
    ],
  },
  {
    id: "ops",
    title: "Operations",
    color: "#64748b",
    apps: [
      { slug: "website", title: "Website", description: "Site health and fixes", href: "/dashboard/website", icon: "globe" },
      { slug: "settings", title: "Settings", description: "Connections and profile", href: "/dashboard/settings", icon: "settings", countKey: "integrations" },
      { slug: "billing", title: "Billing", description: "Plan and invoices", href: "/dashboard/billing", icon: "card" },
    ],
  },
  {
    id: "agents",
    title: "Agents",
    color: "#9333ea",
    apps: [
      { slug: "chat", title: "Chat", description: "Ask anything about your business", href: "/dashboard/chat", icon: "bot" },
      { slug: "briefing", title: "Today", description: "Morning tasks and brief", href: "/dashboard", icon: "sun", countKey: "insights" },
    ],
  },
];
