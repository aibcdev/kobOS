import { Autonomy } from "@/components/kob-home/autonomy";
import { Connect } from "@/components/kob-home/connect";
import { CostWatch } from "@/components/kob-home/cost-watch";
import { HandledToday } from "@/components/kob-home/handled-today";
import { Hero } from "@/components/kob-home/hero";
import { JobTabs } from "@/components/kob-home/job-tabs";
import { KitchenPrep } from "@/components/kob-home/kitchen-prep";
import { Memory } from "@/components/kob-home/memory";
import { PhoneBlock } from "@/components/kob-home/phone-block";
import { PricingBand } from "@/components/kob-home/pricing-band";
import { Reveal } from "@/components/kob-home/reveal";
import { ScanCta } from "@/components/kob-home/scan-cta";
import { WasteBlock } from "@/components/kob-home/waste-block";

export function EmployeeHome() {
  return (
    <div className="bg-bone text-espresso">
      <main>
        <Hero />
        <Reveal>
          <HandledToday />
        </Reveal>
        <Reveal>
          <JobTabs />
        </Reveal>
        <Reveal>
          <CostWatch />
        </Reveal>
        <Reveal>
          <KitchenPrep />
        </Reveal>
        <Reveal>
          <PhoneBlock />
        </Reveal>
        <Reveal>
          <WasteBlock />
        </Reveal>
        <Reveal>
          <Memory />
        </Reveal>
        <Reveal>
          <Autonomy />
        </Reveal>
        <Reveal>
          <Connect />
        </Reveal>
        <Reveal>
          <PricingBand />
        </Reveal>
        <Reveal>
          <ScanCta />
        </Reveal>
      </main>
    </div>
  );
}
