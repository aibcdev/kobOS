/**
 * Product areas reframed as daily tasks—not revenue SKUs.
 */
export const ownerProductPillars = [
  {
    slug: "website",
    title: "Your online shop window",
    headline: "Guests judge you online before they walk in.",
    description:
      "KOB checks your site and listing—photos, menu, hours, mobile speed—and adds fixes to your daily task list.",
    href: "/features/website",
    ownerPath: "/restaurant-website-ai",
  },
  {
    slug: "online-ordering",
    title: "Booking & ordering paths",
    headline: "Make it obvious how to book or order.",
    description:
      "Confusing buttons and buried menus lose guests. Your scan flags what's hard to find—we tell you what to fix.",
    href: "/features/online-ordering",
    ownerPath: "/online-ordering",
  },
  {
    slug: "delivery",
    title: "Listings & hours",
    headline: "Wrong hours cost covers.",
    description:
      "Bank holidays, seasonal hours, delivery zones—KOB reminds you early and drafts updates before guests notice.",
    href: "/features/delivery",
    ownerPath: "/delivery",
  },
  {
    slug: "marketing",
    title: "Posts & promotions",
    headline: "Social and email without the scramble.",
    description:
      "Holiday posts, slow-week promos, review replies—prepared as drafts you approve. Nothing goes live without you.",
    href: "/dashboard/marketing",
    ownerPath: "/automatic-marketing",
  },
] as const;

export type OwnerProductPillar = (typeof ownerProductPillars)[number];
