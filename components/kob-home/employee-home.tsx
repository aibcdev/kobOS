import { Autonomy } from "@/components/kob-home/autonomy";
import { BeforeAfter } from "@/components/kob-home/before-after";
import { Claims } from "@/components/kob-home/claims";
import { Channels } from "@/components/kob-home/channels";
import { Connect } from "@/components/kob-home/connect";
import { Hero } from "@/components/kob-home/hero";
import { Jobs } from "@/components/kob-home/jobs";
import { Loop } from "@/components/kob-home/loop";
import { Memory } from "@/components/kob-home/memory";
import { PricingBand } from "@/components/kob-home/pricing-band";
import { ProductVideo } from "@/components/kob-home/product-video";
import { Reveal } from "@/components/kob-home/reveal";
import { ScanCta } from "@/components/kob-home/scan-cta";
import { Serving } from "@/components/kob-home/serving";
import { SiteFooter } from "@/components/kob-site/site-footer";
import { SiteNav } from "@/components/kob-site/site-nav";

/** Alven-style employee homepage — Talk first, not a dashboard. */
export function EmployeeHome() {
  return (
    <div className="kob-employee min-h-dvh bg-bone text-espresso">
      <SiteNav onPhoto />
      <main>
        <Hero />
        <Claims />
        <Reveal>
          <Loop />
        </Reveal>
        <Reveal>
          <Jobs />
        </Reveal>
        <Reveal>
          <Serving />
        </Reveal>
        <Reveal>
          <Connect />
        </Reveal>
        <Reveal>
          <BeforeAfter />
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
