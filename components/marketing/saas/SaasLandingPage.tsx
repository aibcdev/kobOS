import { SaasBeliefs } from "./SaasBeliefs";
import { SaasBrandGrid } from "./SaasBrandGrid";
import { SaasEcosystemTabs } from "./SaasEcosystemTabs";
import { SaasFinalCta } from "./SaasFinalCta";
import { SaasHeroSection } from "./SaasHeroSection";
import { SaasRatingsMarquee } from "./SaasRatingsMarquee";
import { SaasBenefitTabs } from "./SaasBenefitTabs";
import { SaasTrustBand } from "./SaasTrustBand";
import { WEBSITE_SALES_TABS } from "@/lib/marketing/pillar-benefit-tabs";

export function SaasLandingPage() {
  return (
    <>
      <SaasHeroSection />
      <SaasTrustBand />
      <SaasBenefitTabs
        eyebrow="How KOB helps"
        title="Fix visibility. Grow direct orders."
        subtitle="One platform for your site, search, ordering, and weekly AI priorities."
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
