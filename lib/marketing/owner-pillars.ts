/**
 * Product pillars aligned with Owner.com crawl (20260521-0941).
 * Refresh after `npm run crawl:owner:free` — see `npm run marketing:check-owner`.
 */
export const ownerProductPillars = [
  {
    slug: "website",
    title: "AI website builder",
    headline: "Websites that rank locally and convert on mobile.",
    description:
      "Hospitality-first layouts, menus, and CTAs—plus an AI scan that shows what to fix before you spend on redesigns.",
    href: "/features/website",
    ownerPath: "/restaurant-website-ai",
  },
  {
    slug: "online-ordering",
    title: "Online ordering",
    headline: "Your online ordering should grow your business.",
    description:
      "Ordering flows proven to grow direct sales—so you keep margin instead of feeding third-party apps every week.",
    href: "/features/online-ordering",
    ownerPath: "/online-ordering",
  },
  {
    slug: "delivery",
    title: "Delivery you own",
    headline: "Profitable delivery and a great guest experience.",
    description:
      "Save on delivery-app fees with direct ordering paths guests actually use—commission stays with you.",
    href: "/features/delivery",
    ownerPath: "/delivery",
  },
  {
    slug: "marketing",
    title: "Automatic marketing",
    headline: "Marketing that runs while you run the floor.",
    description:
      "Campaigns and local promos tied to what your AI report flags—so fixes on site and search ship together.",
    href: "/dashboard/marketing",
    ownerPath: "/automatic-marketing",
  },
] as const;

export type OwnerProductPillar = (typeof ownerProductPillars)[number];
