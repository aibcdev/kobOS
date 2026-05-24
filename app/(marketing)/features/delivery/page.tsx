import type { Metadata } from "next";
import { SaasPillarFeaturePage } from "@/components/marketing/saas/SaasPillarFeaturePage";
import { ownerProductPillars } from "@/lib/marketing/owner-pillars";

const pillar = ownerProductPillars.find((p) => p.slug === "delivery")!;

export const metadata: Metadata = {
  title: "Direct delivery for restaurants | KOB",
  description: pillar.description,
};

export default function DeliveryFeaturePage() {
  return <SaasPillarFeaturePage pillar={pillar} />;
}
