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
      "Confusing buttons and buried menus lose guests. Your scan flags what's hard to find and KOB tells you what to change. KOB does not take orders.",
    honesty:
      "If you need your own ordering system or a branded app, compare Owner.com. KOB is for your listing, reviews, hours and website mistakes.",
    href: "/features/online-ordering",
    ownerPath: "/online-ordering",
  },
  {
    slug: "delivery",
    title: "Listings & hours",
    headline: "Wrong hours cost covers.",
    description:
      "Bank holidays, seasonal hours and listing details—KOB checks Google against your website every morning and drafts the fix before guests notice. You approve and update it in a tap.",
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
