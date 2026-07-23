/** KOB launch pricing vs Owner.com (Flex $249+5%, Flat $499). */

export type PricingTierId = "flex" | "flat";

export type PricingPlan = {
  id: PricingTierId;
  name: string;
  badge?: string;
  priceMonthly: number;
  /** Shown as strikethrough when launch pricing is active */
  regularPriceMonthly?: number;
  priceNote: string;
  description: string;
  stripeTier: "starter" | "pro";
  highlight?: boolean;
};

/** Current list pricing (strikethrough compare prices are internal reference only). */
export const LAUNCH_PRICING = {
  active: true,
  label: "Simple pricing",
  detail: "Month-to-month. Cancel anytime.",
} as const;

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "flex",
    name: "Flex",
    badge: "Most popular",
    priceMonthly: 49,
    regularPriceMonthly: 125,
    priceNote: "+ 2.5% platform fee per order",
    description:
      "Daily helper for reviews, hours, and posts—plus credits to request website, SEO, or brand work. Low monthly while you grow.",
    stripeTier: "starter",
    highlight: true,
  },
  {
    id: "flat",
    name: "Flat",
    badge: "Best value",
    priceMonthly: 99,
    regularPriceMonthly: 250,
    priceNote: "No additional order fees",
    description:
      "One predictable monthly price. Same daily list and credit-backed requests—without per-order fees.",
    stripeTier: "pro",
  },
];

export type ComparisonCell = "kob" | "owner" | "both";

export type ComparisonRow = {
  label: string;
  kob: string;
  owner: string;
  kobWins?: boolean;
};

/** Structured KOB vs Owner.com — homepage + pricing reference */
export const OWNER_COMPARISON = {
  competitor: "Owner.com",
  headline: "Same kind of help. Lower price.",
  subline:
    "Owner.com sells a full stack at premium rates. KOB starts with a free scan, a daily list you approve, and credits for website, SEO, and brand requests.",
  ownerFlexNote: "$249/mo + 5% per order",
  ownerFlatNote: "$499/mo flat",
  rows: [
    {
      label: "Monthly (flex-style plan)",
      kob: "$49/mo",
      owner: "$249/mo",
      kobWins: true,
    },
    {
      label: "Per-order fee (flex plan)",
      kob: "2.5%",
      owner: "5%",
      kobWins: true,
    },
    {
      label: "Monthly (flat plan)",
      kob: "$99/mo",
      owner: "$499/mo",
      kobWins: true,
    },
    {
      label: "Free online scan before you pay",
      kob: "Yes — about 1 minute",
      owner: "Demo-led sales",
      kobWins: true,
    },
    {
      label: "Daily task list (reviews, holidays, hours)",
      kob: "Yes — approve in one tap",
      owner: "Product modules to manage",
      kobWins: true,
    },
    {
      label: "Plain English — no agency jargon",
      kob: "Built in",
      owner: "Varies",
      kobWins: true,
    },
    {
      label: "7-day free trial",
      kob: "Yes",
      owner: "Varies",
      kobWins: true,
    },
    {
      label: "Long-term contract",
      kob: "No — cancel anytime",
      owner: "No — month-to-month",
      kobWins: true,
    },
    {
      label: "Typical go-live",
      kob: "Free scan in ~1 min; trial in minutes",
      owner: "Demo call + ~1 week with specialist",
      kobWins: true,
    },
    {
      label: "Core offer",
      kob: "Scan + daily approve list + credit requests",
      owner: "Full stack: website, ordering, app, marketing",
      kobWins: false,
    },
    {
      label: "Free online health scan",
      kob: "Yes — trykob.com/audit",
      owner: "Yes — grader.owner.com (feeds demo)",
      kobWins: true,
    },
  ] satisfies ComparisonRow[],
} as const;

export const PRICING_INCLUDED_FEATURES = [
  { title: "Free online scan", detail: "See what guests notice before you spend a penny." },
  { title: "Daily task helper", detail: "Reviews, holidays, hours, and posts—in a list you approve each morning." },
  { title: "Draft replies & posts", detail: "We prepare copy. Nothing goes live until you say so." },
  { title: "Service requests with credits", detail: "Request website, SEO, logo, or creative work—KOB fulfills it." },
  { title: "UK holiday calendar", detail: "Bank holidays and busy weekends flagged early." },
  { title: "Listing & photo checks", detail: "Flags when Google or your site looks off vs competitors." },
  { title: "Plain-English briefings", detail: "What needs doing, why, and how long—no SEO deck required." },
  { title: "7-day free trial", detail: "Start after your scan. Cancel anytime." },
  { title: "Transparent plans", detail: "Flex from $49/mo or Flat at $99/mo—pick what fits how you take orders." },
] as const;

export const PRICING_FAQ = [
  {
    q: "How much does KOB cost?",
    a: "Flex is $49/mo plus 2.5% on direct orders. Flat is $99/mo with no order fees. Both include the free scan, daily task list, and credits for website, SEO, and brand requests.",
  },
  {
    q: "What is included with KOB?",
    a: "Free scan, daily task list, draft replies and posts, holiday reminders, listing checks, and credits to request website, SEO, or brand work. Flex adds 2.5% on direct orders; Flat has no order fees.",
  },
  {
    q: "What fees do restaurants pay on orders?",
    a: "On Flat, you pay only your monthly subscription. On Flex, you pay $49/mo plus 2.5% on direct orders—half the typical 5% flex fee on comparable platforms.",
  },
  {
    q: "How is KOB different from Owner.com?",
    a: "Owner.com sells a full revenue stack—website, ordering, app, and marketing—starting at $249/mo plus fees. KOB focuses on a free scan, a daily list you approve, and credit-backed requests for website and SEO work. Lower price, clearer next step.",
  },
  {
    q: "Do you require contracts?",
    a: "No long-term contracts. Month-to-month. Cancel when you want.",
  },
  {
    q: "How long does setup take?",
    a: "Run a free scan in about a minute. Trial signup takes a few minutes. Your first daily task list appears after you connect your restaurant.",
  },
] as const;
