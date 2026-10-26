/**
 * What marketing pages may claim.
 * gated = built enough to mention a fallback, not a live result.
 * roadmap = not on the homepage.
 */
export type FeatureReadiness = "live" | "beta" | "gated" | "roadmap";

export const FEATURE_STATUS = {
  googleListingWatch: "live",
  morningBrief: "live",
  reviewReplyDraft: "beta",
  reviewKit: "live",
  websiteCheck: "beta",
  /** Automatic posting to Google waits on Google approving our API access; until then the owner posts in one tap. */
  reviewReplyPost: "roadmap",
  weeklyReport: "gated",
  costWatch: "beta",
  ordering: "roadmap",
  winback: "roadmap",
  wasteEye: "roadmap",
  reservations: "roadmap",
} as const satisfies Record<string, FeatureReadiness>;

export type FeatureKey = keyof typeof FEATURE_STATUS;

export const READINESS_LABEL: Record<FeatureReadiness, string> = {
  live: "Ready now",
  beta: "In beta",
  gated: "In beta",
  roadmap: "Coming soon",
};

/**
 * How work reaches Google today: KOB drafts, the owner approves, then posts it in one tap. Every page says it the same
 * way. Don't claim KOB posts by itself until automatic posting is switched on.
 */
export const POSTING = {
  reviews: "KOB reads your reviews and drafts the replies. You approve, tap once, and post.",
  listing: "Listing fixes drafted for you: hours, description and posts. You approve and update in a tap.",
  brief: "Morning brief: what needs you today, in two minutes.",
  reviewKit: "Review link and QR table cards to get more reviews.",
  control: "Nothing goes out without your OK.",
  status: "One-tap posting (automatic posting coming soon)",
} as const;

export const POSTING_FAQ = {
  q: "Does KOB post for me?",
  a: "Right now KOB drafts everything and you post it with one tap, so you stay in control. Automatic posting is coming once Google finishes approving our access.",
} as const;

export type PublicFeature = {
  key: FeatureKey;
  title: string;
  line: string;
};

/** Owner-language lines. Homepage skips roadmap and gated items that have no fallback. */
export const PUBLIC_FEATURES: PublicFeature[] = [
  {
    key: "googleListingWatch",
    title: "Google listing, kept right",
    line: `Hours, holiday closures and details are checked against your website every morning. ${POSTING.listing}`,
  },
  {
    key: "morningBrief",
    title: "Your morning brief",
    line: "What needs you today, in two minutes. Every reply and fix, ready for your OK.",
  },
  {
    key: "reviewReplyDraft",
    title: "Reviews, answered in your voice",
    line: `${POSTING.reviews} Angry, sensitive or legal-sounding reviews always wait for you.`,
  },
  {
    key: "reviewKit",
    title: "More reviews from happy guests",
    line: `${POSTING.reviewKit} Plus a thank-you message, drafted for you to send.`,
  },
  {
    key: "websiteCheck",
    title: "Website, checked like a guest would",
    line: "Wrong hours, a broken booking button, placeholder text, a dead menu link. KOB flags it and tells you what to change.",
  },
  {
    key: "costWatch",
    title: "Supplier prices, watched",
    line: "Forward supplier invoices and KOB flags price changes line by line. KOB never makes up a saving.",
  },
  {
    key: "weeklyReport",
    title: "A weekly report",
    line: "What KOB did, what you approved, and what changed. Coming to the site soon.",
  },
  {
    key: "reviewReplyPost",
    title: "Automatic posting to Google",
    line: "Coming once Google finishes approving our access. Until then you post in one tap.",
  },
  {
    key: "ordering",
    title: "Direct ordering",
    line: "Not live. KOB does not replace your ordering.",
  },
  {
    key: "winback",
    title: "Win-back",
    line: "Not live.",
  },
  {
    key: "wasteEye",
    title: "Waste Eye",
    line: "Measured waste. Not live.",
  },
  {
    key: "reservations",
    title: "Reservations",
    line: "Not live. Keep the booking system you have.",
  },
];

export function featuresByReadiness(status: FeatureReadiness): PublicFeature[] {
  return PUBLIC_FEATURES.filter((item) => FEATURE_STATUS[item.key] === status);
}

/** Homepage feature list: live and beta only. */
export function homepageFeatures(): PublicFeature[] {
  return PUBLIC_FEATURES.filter((item) => {
    const status = FEATURE_STATUS[item.key];
    if (item.key === "weeklyReport") return false;
    return status === "live" || status === "beta";
  });
}
