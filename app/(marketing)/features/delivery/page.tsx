import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/page-metadata";
import { SaasPillarFeaturePage } from "@/components/marketing/saas/SaasPillarFeaturePage";
import { ownerProductPillars } from "@/lib/marketing/owner-pillars";

const pillar = ownerProductPillars.find((p) => p.slug === "delivery")!;

export const metadata: Metadata = pageMetadata({
  title: "Google hours and listings, kept right",
  description:
    "KOB checks your Google hours, holiday hours and listing details against your website every morning and drafts the fix. You approve and update it in a tap. Not a delivery service.",
  path: "/features/delivery",
});

export default function DeliveryFeaturePage() {
  return <SaasPillarFeaturePage pillar={pillar} />;
}
