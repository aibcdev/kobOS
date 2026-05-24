import type { Metadata } from "next";
import { SaasPillarFeaturePage } from "@/components/marketing/saas/SaasPillarFeaturePage";
import { ownerProductPillars } from "@/lib/marketing/owner-pillars";

const pillar = ownerProductPillars.find((p) => p.slug === "online-ordering")!;

export const metadata: Metadata = {
  title: "Online ordering for restaurants | KOB",
  description: pillar.description,
};

export default function OnlineOrderingFeaturePage() {
  return <SaasPillarFeaturePage pillar={pillar} />;
}
