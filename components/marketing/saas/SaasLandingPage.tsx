import { SaasAuditWhatWeCheck } from "./SaasAuditWhatWeCheck";
import { SaasFinalCta } from "./SaasFinalCta";
import { SaasHeroSection } from "./SaasHeroSection";
import { SaasHowItWorks } from "./SaasHowItWorks";
import { SaasOwnerComparison } from "./SaasOwnerComparison";

export function SaasLandingPage() {
  return (
    <>
      <SaasHeroSection />
      <SaasAuditWhatWeCheck />
      <SaasHowItWorks />
      <SaasOwnerComparison />
      <SaasFinalCta />
    </>
  );
}
