/** KOB public pricing — founding manager offer (canonical). Amounts by region live in `lib/billing/regional-pricing`. */

import { FREE_TRIAL_LABEL, TRIAL_LABEL } from "@/lib/billing/offer";
import { FOUNDING_PRICES } from "@/lib/billing/regional-pricing";

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
  detail: `Keep your founding rate while you stay subscribed. ${TRIAL_LABEL}, no card.`,
} as const;

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "founding",
    name: "Founding",
    badge: "AI restaurant manager",
    priceMonthly: 99,
    priceNote: `USD · per location / month · founding (${FOUNDING_PRICES.GB.label} in the UK)`,
    description:
      "KOB checks your Google listing, reviews and website, drafts the fixes, and waits for your yes.",
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
  eyebrow: "Keep your website and your till.",
  headline: "Keep your website and your till.",
  subline:
    "KOB is the AI restaurant manager around the tools you already have. Owner.com sells a full stack. You do not have to swap your till to get a morning list.",
  ownerFlexNote: "$249/mo + 5% per order",
  ownerFlatNote: "$499/mo flat",
  footnote:
    "*Owner.com public pricing as of 20 Oct 2026 (Flex $249/mo + 5% restaurant fee; Flat $499/mo). Competitor names used for comparison only. Guest phone answering is on the roadmap, not in the founding plan.",
  rows: [
    {
      label: "Monthly",
      kob: `${FOUNDING_PRICES.US.label}/mo founding (${FOUNDING_PRICES.GB.label} UK)`,
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
      label: "Guest phone answering",
      kob: "On the roadmap",
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
      label: FREE_TRIAL_LABEL,
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

export const pricingIncludedFeatures = (priceLabel: string) => [
  {
    title: "Reviews, drafted in your voice",
    detail:
      "A reply for each new Google review. Bad, sensitive or legal-sounding reviews always wait for you. You copy the reply into Google until posting is live.",
  },
  {
    title: "Google listing, kept right",
    detail: "Hours and holiday closures checked against your website. One tap when they disagree.",
  },
  {
    title: "Website, checked like a guest",
    detail: "Wrong hours, broken booking buttons, placeholder text, dead menu links. In beta.",
  },
  {
    title: "Supplier prices",
    detail: "Flags a real price change when you forward invoices. In beta. KOB never invents a saving.",
  },
  {
    title: "You approve first",
    detail: "Nothing goes public without your yes. KOB only marks a job done after it can see the change.",
  },
  {
    title: FREE_TRIAL_LABEL,
    detail: "No card. Cancel anytime. If you never add a card, the trial ends.",
  },
  {
    title: "Founding price",
    detail: `${priceLabel} per location / month while you stay subscribed. ${FOUNDING_PRICES.GB.label} in the UK, ${FOUNDING_PRICES.US.label} elsewhere.`,
  },
];

export const pricingFaq = (priceLabel: string) => [
  {
    q: "Will KOB post anything without me?",
    a: "No. Everything starts on Ask me. Refunds, discounts and replies to bad reviews always wait for you.",
  },
  {
    q: "What if the AI writes something wrong?",
    a: "Every draft is editable. KOB does not promise refunds, admit fault, or mention health or legal issues in a reply.",
  },
  {
    q: "How does KOB know it worked?",
    a: "After you approve, KOB re-reads Google or your website. It marks the job done only when it can see the change.",
  },
  {
    q: "Do I need to change my website, till or booking system?",
    a: "No. KOB works with what you have.",
  },
  {
    q: "What do I need to connect?",
    a: "Nothing, to see the first findings. To fix Google, connect your Google Business Profile. Invoices are optional.",
  },
  {
    q: "Which countries?",
    a: "The UK, Ireland, the US, Canada, Australia, New Zealand, India and South Africa.",
  },
  {
    q: "What does it cost after the trial?",
    a: `${priceLabel} per location per month at the founding rate (${FOUNDING_PRICES.GB.label} UK, ${FOUNDING_PRICES.US.label} elsewhere). No contract. If you do not add a card, the trial ends.`,
  },
  {
    q: "Who is behind KOB?",
    a: "Email hello@trykob.com.",
  },
  {
    q: "How is KOB different from Owner.com?",
    a: "Owner.com sells website, ordering, app and marketing as a full stack. KOB keeps your website and your till, and checks the change went live after you approve.",
  },
];
