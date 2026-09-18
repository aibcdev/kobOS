import type { Metadata } from "next";

import { SaasAuthPage } from "@/components/marketing/saas/SaasAuthPage";

export const metadata: Metadata = {
  title: "Log in · KOB",
  description: "Continue with Google or email to open Talk.",
};

export default function MarketingLoginPage() {
  return <SaasAuthPage defaultMode="signin" />;
}
