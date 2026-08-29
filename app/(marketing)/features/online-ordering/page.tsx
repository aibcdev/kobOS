import type { Metadata } from "next";
import { SaasPillarFeaturePage } from "@/components/marketing/saas/SaasPillarFeaturePage";
import { ownerProductPillars } from "@/lib/marketing/owner-pillars";

const pillar = ownerProductPillars.find((p) => p.slug === "online-ordering")!;

export const metadata: Metadata = {
  title: "Booking and order buttons | KOB",
  description:
    "KOB flags buried book/order links on the website you already have. We do not replace POS, kitchen tablets, or branded ordering apps.",
};

export default function OnlineOrderingFeaturePage() {
  return <SaasPillarFeaturePage pillar={pillar} />;
}
