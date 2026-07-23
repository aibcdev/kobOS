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
    headline: "More 5-star reviews. Faster replies.",
    body: "Guests read your replies before they book. KOB flags reviews that need a response and prepares a draft—you approve in one tap.",
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
    headline: "Quiet nights filled before they happen",
    body: "Mother's Day, Valentine's, bank holidays—KOB reminds you early and drafts posts that drive bookings before the rush.",
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
    headline: "Wrong hours cost customers",
    body: "Wrong hours or an old menu photo costs bookings. KOB watches your Google presence and tells you when something looks off.",
    bullets: [
      "Flags stale photos and missing info",
      "Tasks tied to your free audit",
      "One place instead of five apps",
    ],
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Restaurant website on mobile",
  },
];

export const WEBSITE_GROWTH_TABS: BenefitTab[] = [
  {
    id: "watch",
    label: "Get more customers",
    headline: "Find where diners drop off—and fix it",
    body: "Free audit of your Google presence, website, reviews, and local search. Clear score. Highest-impact fixes first—not another jargon report.",
    bullets: [
      "Free audit in about a minute",
      "See what’s costing you bookings",
      "Prioritised list: Google, menu, reviews, homepage",
    ],
    image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Restaurant online presence",
  },
  {
    id: "approve",
    label: "Keep more customers",
    headline: "Win them back and stay consistent",
    body: "Reviews answered, hours correct, posts that fill quiet nights. You approve every change—so guests keep choosing you.",
    bullets: ["Review replies and requests", "Google posts and hours", "Campaigns when tables need filling"],
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Daily task list",
  },
  {
    id: "consistent",
    label: "Ask KOB",
    headline: "When you need more than a checklist",
    body: "Raining tomorrow? Quiet Tuesday? Ask KOB for a campaign—posts, offers, Google updates—ready to approve. AI is how we work; more customers is the job.",
    bullets: ["Ask anything in plain English", "Campaigns across channels", "You stay in control"],
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Busy restaurant service",
  },
];
