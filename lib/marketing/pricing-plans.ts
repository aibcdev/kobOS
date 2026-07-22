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

/** Founding offer — first venues on trykob.com */
export const LAUNCH_PRICING = {
  active: true,
  label: "Founding member pricing",
  detail: "Lock in this rate as one of our first 10 restaurants.",
  foundingSlots: 10,
} as const;

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "flex",
    name: "Flex",
    badge: "Founding rate",
    priceMonthly: 49,
    regularPriceMonthly: 125,
    priceNote: "+ 2.5% platform fee per order",
    description:
      "Low monthly cost while you grow. Your daily helper watches reviews, holidays, and listings—you approve fixes in one tap.",
    stripeTier: "starter",
  },
  {
    id: "flat",
    name: "Flat",
    badge: "Founding rate",
    priceMonthly: 99,
    regularPriceMonthly: 250,
    priceNote: "No additional order fees",
    description:
      "One predictable monthly price. Best when you want zero per-order fees and a daily list of what needs doing online.",
    stripeTier: "pro",
    highlight: true,
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
  headline: "Same kind of help. Lower price. Built for busy owners.",
  subline:
    "Owner.com charges premium rates for a full growth stack. KOB starts with a free scan and a daily helper—so you never miss reviews, holidays, or listing updates.",
  ownerFlexNote: "$249/mo + 5% per order",
  ownerFlatNote: "$499/mo flat",
  rows: [
    {
      label: "Monthly (flex-style plan)",
      kob: "$49/mo founding",
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
      kob: "$99/mo founding",
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
      kob: "Daily visibility tasks you approve",
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
  { title: "UK holiday calendar", detail: "Bank holidays and busy weekends flagged early." },
  { title: "Listing & photo checks", detail: "Flags when Google or your site looks off vs competitors." },
  { title: "Plain-English briefings", detail: "What needs doing, why, and how long—no SEO deck required." },
  { title: "7-day free trial", detail: "Start after your scan. Cancel anytime." },
  { title: "Founding member rate", detail: "Lock in $49 or $99/mo as one of our first 10 restaurants." },
  { title: "Email support", detail: "Real humans when you need help." },
] as const;

export const PRICING_FAQ = [
  {
    q: "What is founding member pricing?",
    a: "Our first 10 restaurants lock in $49/mo (Flex) or $99/mo (Flat)—well below typical all-in-one platforms like Owner.com ($249–$499/mo). When founding spots fill, standard pricing applies.",
  },
  {
    q: "What is included with KOB?",
    a: "Free scan, daily task list, draft replies and posts, holiday reminders, and listing checks. Flex adds 2.5% on direct orders; Flat has no order fees.",
  },
  {
    q: "What fees do restaurants pay on orders?",
    a: "On Flat, you pay only your monthly subscription. On Flex, you pay $49/mo founding rate plus 2.5% on direct orders—half the typical 5% flex fee on comparable platforms.",
  },
  {
    q: "How is KOB different from Owner.com?",
    a: "Owner.com sells a full revenue stack—website, ordering, app, and marketing automations—starting at $249/mo plus fees, with a demo-led setup. KOB focuses on never missing a beat online—reviews, holidays, hours, posts—with a daily list you approve. Lower price, simpler story, self-serve from a free scan.",
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
