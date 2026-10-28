import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/page-metadata";

import { SaasAuthPage } from "@/components/marketing/saas/SaasAuthPage";

export const metadata: Metadata = pageMetadata({
  title: "Log in",
  description:
    "Log in to KOB with Google or email.",
  path: "/login",
  noindex: true,
});

export default function MarketingLoginPage() {
  return <SaasAuthPage defaultMode="signin" />;
}
