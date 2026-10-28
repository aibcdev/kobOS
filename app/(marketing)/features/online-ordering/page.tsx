import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/page-metadata";
import { SaasPillarFeaturePage } from "@/components/marketing/saas/SaasPillarFeaturePage";
import { ownerProductPillars } from "@/lib/marketing/owner-pillars";

const pillar = ownerProductPillars.find((p) => p.slug === "online-ordering")!;

export const metadata: Metadata = pageMetadata({
  title: "Booking and order buttons guests can find",
  description:
    "KOB flags buried book and order links on the website you already have, and tells you what to change. KOB does not take orders or replace your ordering system.",
  path: "/features/online-ordering",
});

export default function OnlineOrderingFeaturePage() {
  return <SaasPillarFeaturePage pillar={pillar} />;
}
