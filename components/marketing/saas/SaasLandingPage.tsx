import { AuditLiveAnalysis } from "@/components/marketing/audit/AuditLiveAnalysis";

import { SaasFinalCta } from "./SaasFinalCta";
import { SaasHeroSection } from "./SaasHeroSection";
import { SaasHowItWorks } from "./SaasHowItWorks";
import { SaasOwnerComparison } from "./SaasOwnerComparison";

export function SaasLandingPage() {
  return (
    <>
      <SaasHeroSection />
      <AuditLiveAnalysis mode="demo" showChrome={false} />
      <SaasHowItWorks />
      <SaasOwnerComparison />
      <SaasFinalCta />
    </>
  );
}
