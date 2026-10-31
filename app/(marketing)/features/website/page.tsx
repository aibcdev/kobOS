import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/page-metadata";

import { SaasWebsiteFeaturePage } from "@/components/marketing/saas/SaasWebsiteFeaturePage";

export const metadata: Metadata = pageMetadata({
  title: "Your restaurant website, checked like a guest would",
  description:
    "KOB checks the website you already have for wrong hours, broken booking buttons and dead menu links, and tells you what to fix. KOB does not build or host websites.",
  path: "/features/website",
});

export default function WebsiteFeaturePage() {
  return <SaasWebsiteFeaturePage />;
}
