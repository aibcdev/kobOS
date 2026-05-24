import type { Metadata } from "next";

import { SaasAuthPage } from "@/components/marketing/saas/SaasAuthPage";

export const metadata: Metadata = {
  title: "Sign in | KOB",
  description: "Sign in to your KOB growth workspace with a secure email link.",
};

export default function MarketingLoginPage() {
  return <SaasAuthPage defaultMode="signin" />;
}
