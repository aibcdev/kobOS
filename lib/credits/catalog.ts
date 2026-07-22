import type { ServiceRequestType, SubscriptionPlan } from "@prisma/client";

/** Monthly credit allotment by plan (granted once per calendar month). */
export function monthlyCreditGrant(plan: SubscriptionPlan): number {
  switch (plan) {
    case "STARTER":
      return Number(process.env.CREDITS_STARTER_MONTHLY?.trim() || "50") || 50;
    case "PRO":
      return Number(process.env.CREDITS_PRO_MONTHLY?.trim() || "120") || 120;
    default:
      return 0;
  }
}

export type ServiceCatalogItem = {
  type: ServiceRequestType;
  title: string;
  description: string;
  creditCost: number;
};

/** Human-fulfilled deliverables — KOB does the work after the owner requests + spends credits. */
export const SERVICE_CATALOG: ServiceCatalogItem[] = [
  {
    type: "WEBSITE",
    title: "New website",
    description: "We design and ship a new restaurant website. You request — our team builds it.",
    creditCost: Number(process.env.CREDITS_COST_WEBSITE?.trim() || "40") || 40,
  },
  {
    type: "LOGO",
    title: "Logo / brand mark",
    description: "Logo refresh or new mark for your restaurant. Delivered manually by our team.",
    creditCost: Number(process.env.CREDITS_COST_LOGO?.trim() || "25") || 25,
  },
  {
    type: "SEO_RESURFACE",
    title: "SEO re-surfacing",
    description: "Listings, local SEO, and on-page fixes so you show up for the right searches.",
    creditCost: Number(process.env.CREDITS_COST_SEO?.trim() || "20") || 20,
  },
  {
    type: "CREATIVE_PACK",
    title: "Creative pack (ads + photos)",
    description: "A month of UGC-style creatives and dish photography, produced for your brand.",
    creditCost: Number(process.env.CREDITS_COST_CREATIVE?.trim() || "10") || 10,
  },
];

export function catalogItem(type: ServiceRequestType): ServiceCatalogItem | undefined {
  return SERVICE_CATALOG.find((s) => s.type === type);
}
