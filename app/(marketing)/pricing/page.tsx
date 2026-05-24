import type { Metadata } from "next";

import { SaasPricingPage } from "@/components/marketing/saas/SaasPricingPage";
import { marketingCopy } from "@/lib/marketing/copy";

export const metadata: Metadata = {
  title: "Pricing | KOB",
  description: marketingCopy.pricing.lead,
};

export default function PricingPage() {
  return <SaasPricingPage />;
}
