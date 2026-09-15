import { Autonomy } from "@/components/kob-home/autonomy";
import { BeforeAfter } from "@/components/kob-home/before-after";
import { Channels } from "@/components/kob-home/channels";
import { Connect } from "@/components/kob-home/connect";
import { Employee } from "@/components/kob-home/employee";
import { Hero } from "@/components/kob-home/hero";
import { Jobs } from "@/components/kob-home/jobs";
import { Loop } from "@/components/kob-home/loop";
import { Memory } from "@/components/kob-home/memory";
import { PricingBand } from "@/components/kob-home/pricing-band";
import { ProductVideo } from "@/components/kob-home/product-video";
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
        <Loop />
        <Jobs />
        <Serving />
        <Employee />
        <Connect />
        <BeforeAfter />
        <ProductVideo />
        <Memory />
        <Autonomy />
        <PricingBand />
        <Channels />
        <ScanCta />
      </main>
      <SiteFooter />
    </div>
  );
}
