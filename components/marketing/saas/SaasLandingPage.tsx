import { AuditLiveAnalysis } from "@/components/marketing/audit/AuditLiveAnalysis";

import { SaasFinalCta } from "./SaasFinalCta";
import { SaasHeroSection } from "./SaasHeroSection";
import { SaasHowItWorks } from "./SaasHowItWorks";
import { SaasLogoWall } from "./SaasLogoWall";
import { SaasOwnerComparison } from "./SaasOwnerComparison";

export function SaasLandingPage() {
  return (
    <>
      <SaasHeroSection />
      <AuditLiveAnalysis mode="demo" showChrome={false} />
      <section className="bg-[#f9f6f1] px-6 pb-10 md:pb-14">
        <div className="mx-auto max-w-[83rem]">
          <SaasLogoWall />
        </div>
      </section>
      <SaasHowItWorks />
      <SaasOwnerComparison />
      <SaasFinalCta />
    </>
  );
}
