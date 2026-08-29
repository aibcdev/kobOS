import type { Metadata } from "next";
import { SaasPillarFeaturePage } from "@/components/marketing/saas/SaasPillarFeaturePage";
import { ownerProductPillars } from "@/lib/marketing/owner-pillars";

const pillar = ownerProductPillars.find((p) => p.slug === "delivery")!;

export const metadata: Metadata = {
  title: "Google hours and listings | KOB",
  description:
    "KOB reminds you to fix hours, holidays, and listing details guests use before they visit. Not a delivery marketplace.",
};

export default function DeliveryFeaturePage() {
  return <SaasPillarFeaturePage pillar={pillar} />;
}
