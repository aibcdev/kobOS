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
  /** Dashboard path this service maps to (optional). */
  href?: string;
};

/**
 * Human-fulfilled deliverables — click Request → status REQUESTED → ops fulfills manually.
 * AUDIT_FIX is created from Today wins (0 credits), not listed here.
 */
export const SERVICE_CATALOG: ServiceCatalogItem[] = [
  {
    type: "WEBSITE",
    title: "New website",
    description: "We design and ship a new restaurant website. You request — our team builds it.",
    creditCost: Number(process.env.CREDITS_COST_WEBSITE?.trim() || "40") || 40,
    href: "/dashboard/website",
  },
  {
    type: "LOGO",
    title: "Logo / brand mark",
    description: "Logo refresh or new mark for your restaurant. Delivered manually by our team.",
    creditCost: Number(process.env.CREDITS_COST_LOGO?.trim() || "25") || 25,
    href: "/dashboard/brand",
  },
  {
    type: "BRAND_PHOTOS",
    title: "Brand & food photos",
    description: "Dish photography and brand visuals produced for your restaurant.",
    creditCost: Number(process.env.CREDITS_COST_BRAND_PHOTOS?.trim() || "15") || 15,
    href: "/dashboard/brand",
  },
  {
    type: "SEO_RESURFACE",
    title: "SEO re-surfacing",
    description: "Listings, local SEO, and on-page fixes so you show up for the right searches.",
    creditCost: Number(process.env.CREDITS_COST_SEO?.trim() || "20") || 20,
    href: "/dashboard/seo",
  },
  {
    type: "LISTINGS",
    title: "Google Presence / listings",
    description: "Google Business Profile cleanup — hours, photos, categories, consistency.",
    creditCost: Number(process.env.CREDITS_COST_LISTINGS?.trim() || "15") || 15,
    href: "/dashboard/listings",
  },
  {
    type: "MENU",
    title: "Online menu",
    description: "Publish or refresh a clear, searchable menu on your site.",
    creditCost: Number(process.env.CREDITS_COST_MENU?.trim() || "15") || 15,
    href: "/dashboard/menu",
  },
  {
    type: "REVIEWS",
    title: "Reviews engine",
    description: "Review reply playbook and recovery follow-ups set up for your venue.",
    creditCost: Number(process.env.CREDITS_COST_REVIEWS?.trim() || "10") || 10,
    href: "/dashboard/reviews",
  },
  {
    type: "SOCIAL",
    title: "Social media pack",
    description: "A month of posts and captions tailored to your restaurant.",
    creditCost: Number(process.env.CREDITS_COST_SOCIAL?.trim() || "12") || 12,
    href: "/dashboard/content",
  },
  {
    type: "CREATIVE_PACK",
    title: "Creative pack (ads + photos)",
    description: "A month of UGC-style creatives and dish photography, produced for your brand.",
    creditCost: Number(process.env.CREDITS_COST_CREATIVE?.trim() || "10") || 10,
    href: "/dashboard/creative",
  },
  {
    type: "ORDERING",
    title: "Online ordering setup",
    description: "We configure ordering rails and guest-facing order paths for your restaurant.",
    creditCost: Number(process.env.CREDITS_COST_ORDERING?.trim() || "25") || 25,
    href: "/dashboard/ordering",
  },
  {
    type: "DELIVERY",
    title: "Delivery listings",
    description: "Delivery presence and listing strategy so guests find you off-site.",
    creditCost: Number(process.env.CREDITS_COST_DELIVERY?.trim() || "15") || 15,
    href: "/dashboard/delivery",
  },
  {
    type: "CATERING",
    title: "Catering capture",
    description: "Catering inquiry flow on your site so group orders don’t get lost.",
    creditCost: Number(process.env.CREDITS_COST_CATERING?.trim() || "10") || 10,
    href: "/dashboard/catering",
  },
];

export function catalogItem(type: ServiceRequestType): ServiceCatalogItem | undefined {
  return SERVICE_CATALOG.find((s) => s.type === type);
}

export function catalogTitle(type: ServiceRequestType): string {
  if (type === "AUDIT_FIX") return "Audit fix";
  if (type === "OTHER") return "Custom request";
  return catalogItem(type)?.title ?? type.replace(/_/g, " ");
}
