import { SaasOwnerComparison } from "./SaasOwnerComparison";
import { SaasBeliefs } from "./SaasBeliefs";
import { SaasBrandGrid } from "./SaasBrandGrid";
import { SaasEcosystemTabs } from "./SaasEcosystemTabs";
import { SaasFinalCta } from "./SaasFinalCta";
import { SaasHeroSection } from "./SaasHeroSection";
import { SaasIndustryStatsBand } from "./SaasIndustryStatsBand";
import { SaasRatingsMarquee } from "./SaasRatingsMarquee";
import { SaasBenefitTabs } from "./SaasBenefitTabs";
import { SaasTrustBand } from "./SaasTrustBand";
import { WEBSITE_SALES_TABS } from "@/lib/marketing/pillar-benefit-tabs";

export function SaasLandingPage() {
  return (
    <>
      <SaasHeroSection />
      <SaasIndustryStatsBand />
      <SaasTrustBand />
      <SaasOwnerComparison />
      <SaasBenefitTabs
        eyebrow="How KOB helps"
        title="Never miss a beat online."
        subtitle="Reviews, holidays, hours, and posts—handled with a daily list you approve in one tap."
        tabs={WEBSITE_SALES_TABS}
      />
      <SaasEcosystemTabs />
      <SaasRatingsMarquee />
      <SaasBrandGrid />
      <SaasBeliefs />
      <SaasFinalCta />
    </>
  );
}
