import type { Metadata } from "next";

import { SaasWebsiteFeaturePage } from "@/components/marketing/saas/SaasWebsiteFeaturePage";

export const metadata: Metadata = {
  title: "AI restaurant websites | KOB",
  description:
    "Restaurant websites built for search and direct orders—mobile-first, fast, and tied to your free AI visibility scan.",
};

export default function WebsiteFeaturePage() {
  return <SaasWebsiteFeaturePage />;
}
