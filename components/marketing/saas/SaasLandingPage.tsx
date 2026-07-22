import { SaasOwnerComparison } from "./SaasOwnerComparison";
import { SaasFinalCta } from "./SaasFinalCta";
import { SaasHeroSection } from "./SaasHeroSection";
import { SaasHowItWorks } from "./SaasHowItWorks";
import { SaasIndustryStatsBand } from "./SaasIndustryStatsBand";
import { SaasTrustBand } from "./SaasTrustBand";

export function SaasLandingPage() {
  return (
    <>
      <SaasHeroSection />
      <SaasTrustBand />
      <SaasHowItWorks />
      <SaasIndustryStatsBand />
      <SaasOwnerComparison />
      <SaasFinalCta />
    </>
  );
}
