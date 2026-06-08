/**
 * Verified restaurant industry statistics for public marketing copy.
 * No competitor names in user-facing strings — sources documented here for internal reference.
 */

export const industryStats = {
  websiteBeforeVisit: {
    value: "77%",
    label: "check your site before they visit or order",
    /** Industry guest survey (US source data; UK copy uses “guests”) */
  },
  deterredByWeakSite: {
    value: "70%",
    label: "are put off by a weak website",
    /** Of guests who checked the site first */
  },
  visitForMenu: {
    value: "57%",
    label: "visit mainly to see the menu",
  },
  menuPhotoOrders: {
    value: "70%+",
    label: "more orders when menus show great food photos",
  },
  revenueWithWebsite: {
    value: "15–20%",
    label: "higher monthly revenue vs venues with no real website",
  },
  takeawayLikelihood: {
    value: "2 in 3",
    label: "adults more likely to order takeaway than before the pandemic",
  },
} as const;

export const industryStatsFootnote = "Industry surveys; results vary by venue." as const;

export const industryStatsBand = {
  title: "Your website is your front door online",
  subtitle: "What industry research shows about how guests decide before they visit or order.",
  stats: [
    industryStats.websiteBeforeVisit,
    industryStats.deterredByWeakSite,
    industryStats.menuPhotoOrders,
  ],
  footnote: industryStatsFootnote,
} as const;
