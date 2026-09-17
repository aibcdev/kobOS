import { Autonomy } from "@/components/kob-home/autonomy";
import { Claims } from "@/components/kob-home/claims";
import { Channels } from "@/components/kob-home/channels";
import { Connect } from "@/components/kob-home/connect";
import { CostWatch } from "@/components/kob-home/cost-watch";
import { HandledToday } from "@/components/kob-home/handled-today";
import { Hero } from "@/components/kob-home/hero";
import { JobTabs } from "@/components/kob-home/job-tabs";
import { KitchenPrep } from "@/components/kob-home/kitchen-prep";
import { Loop } from "@/components/kob-home/loop";
import { Memory } from "@/components/kob-home/memory";
import { PhoneBlock } from "@/components/kob-home/phone-block";
import { PricingBand } from "@/components/kob-home/pricing-band";
import { ProductVideo } from "@/components/kob-home/product-video";
import { Reveal } from "@/components/kob-home/reveal";
import { ScanCta } from "@/components/kob-home/scan-cta";
import { SiteFooter } from "@/components/kob-site/site-footer";
import { SiteNav } from "@/components/kob-site/site-nav";

export function EmployeeHome() {
  return (
    <div className="kob-employee min-h-dvh bg-bone text-espresso">
      <SiteNav onPhoto />
      <main>
        <Hero />
        <Claims />
        <Reveal>
          <HandledToday />
        </Reveal>
        <Reveal>
          <JobTabs />
        </Reveal>
        <Reveal>
          <PhoneBlock />
        </Reveal>
        <Reveal>
          <CostWatch />
        </Reveal>
        <Reveal>
          <KitchenPrep />
        </Reveal>
        <Reveal>
          <Loop />
        </Reveal>
        <Reveal>
          <Connect />
        </Reveal>
        <Reveal>
          <ProductVideo />
        </Reveal>
        <Reveal>
          <Memory />
        </Reveal>
        <Reveal>
          <Autonomy />
        </Reveal>
        <Reveal>
          <PricingBand />
        </Reveal>
        <Reveal>
          <Channels />
        </Reveal>
        <Reveal>
          <ScanCta />
        </Reveal>
      </main>
      <SiteFooter />
    </div>
  );
}
