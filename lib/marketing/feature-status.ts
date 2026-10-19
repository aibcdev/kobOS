/**
 * What marketing pages may claim.
 * gated = built enough to mention a fallback, not a live result.
 * roadmap = not on the homepage.
 */
export type FeatureReadiness = "live" | "beta" | "connecting" | "gated" | "roadmap";

export const FEATURE_STATUS = {
  googleListingWatch: "live",
  websiteCheck: "beta",
  reviewReplyDraft: "beta",
  reviewReplyPost: "gated",
  weeklyReport: "gated",
  costWatch: "beta",
  prep: "beta",
  phone: "roadmap",
  ordering: "roadmap",
  winback: "roadmap",
  wasteEye: "roadmap",
  reservations: "roadmap",
} as const satisfies Record<string, FeatureReadiness>;

export type FeatureKey = keyof typeof FEATURE_STATUS;

export const READINESS_LABEL: Record<FeatureReadiness, string> = {
  live: "Ready now",
  beta: "In beta",
  connecting: "Connecting",
  gated: "In beta",
  roadmap: "On the roadmap",
};

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
    line: "Hours, holiday closures and details are checked against your website every morning. When they disagree, you get a one-tap fix.",
  },
  {
    key: "websiteCheck",
    title: "Website, checked like a guest would",
    line: "Wrong hours, a broken booking button, placeholder text, a dead menu link. KOB flags it and tells you what to change.",
  },
  {
    key: "reviewReplyDraft",
    title: "Reviews, answered in your voice",
    line: "Every new Google review gets a draft reply in your tone and house rules. Angry, sensitive or legal-sounding reviews always wait for you. Posting to Google is not live yet — you copy the reply and open it in Google.",
  },
  {
    key: "costWatch",
    title: "Supplier prices, watched",
    line: "Forward supplier invoices and KOB flags price changes line by line. KOB never makes up a saving.",
  },
  {
    key: "prep",
    title: "Prep notes",
    line: "Quantities when your till is connected. If it is not, KOB says so.",
  },
  {
    key: "weeklyReport",
    title: "A weekly report",
    line: "What KOB did, what you approved, and what changed. Not on the site until that report is live.",
  },
  {
    key: "phone",
    title: "KOB Phone",
    line: "Guest answering. Not live.",
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

/** Homepage feature list: live and beta only. Review posting stays a draft. */
export function homepageFeatures(): PublicFeature[] {
  return PUBLIC_FEATURES.filter((item) => {
    const status = FEATURE_STATUS[item.key];
    if (item.key === "prep" || item.key === "weeklyReport") return false;
    return status === "live" || status === "beta";
  });
}
