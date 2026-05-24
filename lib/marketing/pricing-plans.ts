/** KOB pricing — ~50% below Owner.com Flex ($249+5%) and Flat ($499). */

export type PricingTierId = "flex" | "flat";

export type PricingPlan = {
  id: PricingTierId;
  name: string;
  badge?: string;
  priceMonthly: number;
  priceNote: string;
  description: string;
  stripeTier: "starter" | "pro";
  highlight?: boolean;
};

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "flex",
    name: "Flex",
    badge: "Flexible",
    priceMonthly: 125,
    priceNote: "+ 2.5% platform fee per order",
    description:
      "Lower monthly cost with a small per-order fee. Your costs scale with sales—ideal when you're growing online volume.",
    stripeTier: "starter",
  },
  {
    id: "flat",
    name: "Flat",
    badge: "Predictable",
    priceMonthly: 250,
    priceNote: "No additional order fees",
    description:
      "Fixed monthly cost with no restaurant fees on orders. Best when you do $2.5k+/mo in direct online sales.",
    stripeTier: "pro",
    highlight: true,
  },
];

export const PRICING_INCLUDED_FEATURES = [
  { title: "AI-optimised website", detail: "Built to rank on Google. Most venues see stronger local visibility within weeks." },
  { title: "Online ordering", detail: "Turn more visitors into customers with a fast, branded checkout." },
  { title: "Branded mobile app", detail: "Guests who use your app reorder more often—without marketplace fees." },
  { title: "Automated SEO pages", detail: "Local landing pages that capture high-intent searches in your area." },
  { title: "Loyalty & rewards", detail: "Repeat-order programs like the big chains—on your brand." },
  { title: "AI-powered marketing", detail: "Email and SMS campaigns tuned from your Growth Agent priorities." },
  { title: "Direct catering orders", detail: "Catering menus, easy ordering, and pages local businesses can find." },
  { title: "Free AI visibility audit", detail: "Ongoing scans show what's broken before you spend on redesigns." },
  { title: "Setup & migration", detail: "We help you switch from your old site or marketplace listing." },
  { title: "Chargeback protection", detail: "Stay protected from fraudulent chargebacks on direct orders." },
  { title: "24/7 support", detail: "Hospitality runs late—we're here when you need us." },
] as const;

export const PRICING_FAQ = [
  {
    q: "What is included with KOB?",
    a: "Both plans include the full platform: AI website, online ordering, branded app, SEO pages, loyalty, marketing automations, and your free visibility audit. The difference is how you pay—Flex has a lower subscription plus a small per-order fee; Flat is one predictable monthly price.",
  },
  {
    q: "What fees do restaurants pay on orders?",
    a: "On Flat, you pay only your monthly subscription—no restaurant fees on orders. On Flex, you pay $125/month plus 2.5% on direct orders. Guests may see a small order support fee (similar to industry norms, but lower than typical marketplace markups).",
  },
  {
    q: "Can I switch plans?",
    a: "Yes. Many venues start on Flex and move to Flat as direct orders grow. Switch anytime from your billing page.",
  },
  {
    q: "Do you require contracts?",
    a: "No long-term contracts. Month-to-month billing. Cancel when you want—no cancellation fees.",
  },
  {
    q: "How long does setup take?",
    a: "Many restaurants launch within one to two weeks. Have your domain, Google Business Profile, and menu ready to move faster.",
  },
  {
    q: "Should I stop using delivery apps?",
    a: "Most customers use apps for discovery, then steer guests to order on their KOB site and app—keeping margin on repeat visits.",
  },
] as const;
