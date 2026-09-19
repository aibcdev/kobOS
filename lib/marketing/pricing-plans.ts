/** KOB public pricing — £99 founding manager offer (canonical). */

export type PricingTierId = "founding";

export type PricingPlan = {
  id: PricingTierId;
  name: string;
  badge?: string;
  priceMonthly: number;
  priceNote: string;
  description: string;
  stripeTier: "pro";
  highlight?: boolean;
};

export const LAUNCH_PRICING = {
  active: true,
  label: "Founding price",
  detail: "Keep £99/mo while you stay subscribed. 7-day trial, no card.",
} as const;

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "founding",
    name: "Founding",
    badge: "AI restaurant manager",
    priceMonthly: 99,
    priceNote: "GBP · per location / month · founding",
    description:
      "KOB runs the work around your restaurant — Google, reviews, hours, costs, and prep. You approve before anything public goes live.",
    stripeTier: "pro",
    highlight: true,
  },
];

export type ComparisonRow = {
  label: string;
  kob: string;
  owner: string;
  kobWins?: boolean;
};

/** Structured KOB vs Owner.com — honest labels only */
export const OWNER_COMPARISON = {
  competitor: "Owner.com",
  eyebrow: "UK independents first.",
  headline: "Lower price. No POS swap.",
  subline:
    "Owner.com sells a full stack at premium rates. KOB is the AI restaurant manager: Talk, approve, verify — not a till replacement.",
  ownerFlexNote: "$249/mo + 5% per order",
  ownerFlatNote: "$499/mo flat",
  footnote:
    "*Owner.com public pricing as of 2026-06-20 (Flex $249/mo + 5% restaurant fee; Flat $499/mo). Competitor names used for comparison only. KOB Phone answering is Coming next.",
  rows: [
    {
      label: "Monthly",
      kob: "£99/mo founding",
      owner: "$249–$499/mo",
      kobWins: true,
    },
    {
      label: "AI manager (Talk + approve)",
      kob: "Yes",
      owner: "Product modules",
      kobWins: true,
    },
    {
      label: "24/7 phone answering",
      kob: "Coming next",
      owner: "Owner product",
      kobWins: false,
    },
    {
      label: "Free public scan before you pay",
      kob: "Yes — about 1 minute",
      owner: "Demo-led sales",
      kobWins: true,
    },
    {
      label: "Replace POS / ordering stack",
      kob: "No — we don’t",
      owner: "Yes — core offer",
      kobWins: true,
    },
    {
      label: "7-day free trial",
      kob: "Yes — no card",
      owner: "Varies",
      kobWins: true,
    },
    {
      label: "Long-term contract",
      kob: "No — cancel anytime",
      owner: "No — month-to-month",
      kobWins: true,
    },
  ] satisfies ComparisonRow[],
} as const;

export const PRICING_INCLUDED_FEATURES = [
  { title: "Morning brief", detail: "What needs you today — hours, reviews, costs, prep." },
  { title: "You approve first", detail: "Nothing public until you say yes. Autopilot only where you allow." },
  { title: "Google & website watch", detail: "Public hours and listing checks. Verified Done only after read-back." },
  { title: "Cost Watch", detail: "Inbox invoices first; photo OCR as fallback." },
  { title: "Prep notes", detail: "BETA predictive quantities when weather/bookings exist — not measured waste." },
  { title: "KOB Phone", detail: "Coming next — join the beta waitlist. Not live answering today." },
  { title: "7-day free trial", detail: "No card. Cancel before day 7 and you pay nothing." },
  { title: "Founding price", detail: "£99 per location / month while you stay subscribed." },
] as const;

export const PRICING_FAQ = [
  {
    q: "How much does KOB cost?",
    a: "£99 per location / month at the founding rate while you stay subscribed. 7-day trial with no card.",
  },
  {
    q: "What is included?",
    a: "Talk with KOB, morning brief, drafts for reviews and hours, Cost Watch, Prep BETA, and house-rule memory. Phone answering is Coming next.",
  },
  {
    q: "Do you replace my till or ordering?",
    a: "No. KOB is the AI restaurant manager around the tools you already have — not an Owner.com-style POS clone.",
  },
  {
    q: "How is KOB different from Owner.com?",
    a: "Owner.com sells website, ordering, app, and marketing as a full stack. KOB runs the manager work — Google, reviews, hours, costs, prep — with approve-before-live. Phone answering is Coming next on KOB.",
  },
  {
    q: "Do you require contracts?",
    a: "No long-term contracts. Month-to-month. Cancel when you want.",
  },
  {
    q: "How long does setup take?",
    a: "Find your restaurant, see public findings in under two minutes, create an account, and land in Talk with prioritized work.",
  },
] as const;
