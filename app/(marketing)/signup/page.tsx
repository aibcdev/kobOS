import type { Metadata } from "next";

import { SaasAuthPage } from "@/components/marketing/saas/SaasAuthPage";

export const metadata: Metadata = {
  title: "Create account | KOB",
  description: "Create your KOB account and start your free trial.",
};

export default function MarketingSignupPage() {
  return <SaasAuthPage defaultMode="signup" />;
}
