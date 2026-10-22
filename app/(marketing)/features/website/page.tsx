import type { Metadata } from "next";

import { SaasWebsiteFeaturePage } from "@/components/marketing/saas/SaasWebsiteFeaturePage";

export const metadata: Metadata = {
  title: "Restaurant websites | KOB",
  description:
    "Restaurant websites built for search and direct orders—mobile-first, fast, and tied to your free restaurant check-up.",
};

export default function WebsiteFeaturePage() {
  return <SaasWebsiteFeaturePage />;
}
