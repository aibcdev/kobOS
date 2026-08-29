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
    honesty:
      "KOB does not rebuild your site as a hosted CMS on day one. The trial is scan + approve-list. Website credits are optional requests.",
    href: "/features/website",
    ownerPath: "/restaurant-website-ai",
  },
  {
    slug: "online-ordering",
    title: "Booking & ordering paths",
    headline: "Make it obvious how to book or order — on the site you already have.",
    description:
      "Confusing buttons and buried menus lose guests. Your scan flags what's hard to find. We do not replace your POS, kitchen tablet, or branded ordering app.",
    honesty:
      "If you need first-party ordering, a branded app, and a kitchen tablet, compare Owner.com. KOB is for listing, reviews, hours, and conversion leaks first.",
    href: "/features/online-ordering",
    ownerPath: "/online-ordering",
  },
  {
    slug: "delivery",
    title: "Listings & hours",
    headline: "Wrong hours cost covers.",
    description:
      "Bank holidays, seasonal hours, delivery-zone copy on your listing—KOB reminds you early and drafts updates before guests notice. This is not a courier network or marketplace.",
    honesty:
      "KOB does not run delivery logistics. We keep Google hours and listing details accurate so guests show up when you are actually open.",
    href: "/features/delivery",
    ownerPath: "/delivery",
  },
  {
    slug: "marketing",
    title: "Posts & promotions",
    headline: "Social and email without the scramble.",
    description:
      "Holiday posts, slow-week promos, review replies—prepared as drafts you approve. Nothing goes live without you.",
    honesty:
      "Drafts sit in your daily list. We are not an SMS/push marketing suite with a branded guest app.",
    href: "/dashboard/marketing",
    ownerPath: "/automatic-marketing",
  },
] as const;

export type OwnerProductPillar = (typeof ownerProductPillars)[number];
