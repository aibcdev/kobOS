export type BenefitTab = {
  id: string;
  label: string;
  headline: string;
  body: string;
  bullets: string[];
  image: string;
  imageAlt: string;
};

export const WEBSITE_SALES_TABS: BenefitTab[] = [
  {
    id: "reviews",
    label: "Reviews",
    headline: "Never let a review sit unanswered",
    body: "Guests read your replies. KOB flags reviews that need a response and prepares a draft—you approve in one tap.",
    bullets: [
      "Morning list of reviews worth answering",
      "Plain-English drafts in your tone",
      "Nothing posts until you say so",
    ],
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Restaurant guests at table",
  },
  {
    id: "holidays",
    label: "Holidays & events",
    headline: "Bank holidays and busy weekends—handled early",
    body: "Mother's Day, Valentine's, bank holidays—KOB reminds you in advance and drafts email and social posts before the rush.",
    bullets: [
      "UK holiday calendar built in",
      "Draft posts ready to approve",
      "Hours and closures flagged early",
    ],
    image: "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Restaurant celebration",
  },
  {
    id: "listings",
    label: "Hours & listings",
    headline: "Hours, menu, and Google—always current",
    body: "Wrong hours or an old menu photo costs bookings. KOB watches your listings and tells you when something looks off.",
    bullets: [
      "Flags stale photos and missing info",
      "Tasks tied to your free scan",
      "One place instead of five apps",
    ],
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Restaurant website on mobile",
  },
];

export const WEBSITE_GROWTH_TABS: BenefitTab[] = [
  {
    id: "watch",
    label: "We watch",
    headline: "We check what guests see online",
    body: "Your website, Google listing, reviews, and photos—scored against strong venues in your area. You get a clear report, not jargon.",
    bullets: ["Free scan in about a minute", "Competitor comparison in your city", "Plain list of what to fix first"],
    image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Restaurant online presence",
  },
  {
    id: "fix",
    label: "You approve",
    headline: "Every morning: what needs doing",
    body: "A short task list—reviews, posts, hours, photos—with a reason in plain English. Tap approve and we prepare the draft.",
    bullets: ["Tasks from your scan data", "Estimated minutes per task", "Drafts ready for you to review"],
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Daily task list",
  },
  {
    id: "consistent",
    label: "Stay consistent",
    headline: "Stop small things slipping",
    body: "While you run service, KOB keeps an eye on the online stuff guests notice before they book—so you don't miss a beat.",
    bullets: ["Same helper every day", "No agency retainer", "Cancel anytime"],
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Busy restaurant service",
  },
];
