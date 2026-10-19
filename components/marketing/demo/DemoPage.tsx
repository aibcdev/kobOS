import {
  SaasPageHero,
  SaasPrimaryCta,
  SaasSecondaryCta,
} from "@/components/marketing/saas/SaasPageHero";
import { SaasSection } from "@/components/marketing/saas/SaasSection";
import { trialPromise } from "@/lib/billing/trial-days";

import { DemoOnboardingForm } from "@/components/marketing/demo/DemoOnboardingForm";

const DEMO_FEATURES = [
  {
    title: "Reviews",
    desc: "Draft replies in your voice. Bad reviews always wait for you.",
  },
  {
    title: "Google listing",
    desc: "Hours and holiday closures checked against your website.",
  },
  {
    title: "Website mistakes",
    desc: "Wrong hours, broken booking buttons, placeholder text, dead links.",
  },
  {
    title: "Supplier prices",
    desc: "Price changes on invoices you forward. In beta. No invented savings.",
  },
] as const;

export function DemoPage() {
  const trial = trialPromise();
  return (
    <div className="bg-bone">
      <SaasPageHero
        eyebrow="Book a call"
        variant="inset"
        title="See the morning list on your restaurant."
        description="We walk through reviews, your Google listing, website mistakes and supplier prices. KOB does not replace your till. The self-serve scan is on the audit page if you would rather start alone."
      >
        <SaasPrimaryCta href="#demo-form">Book a call</SaasPrimaryCta>
        <SaasSecondaryCta href="/audit">Free scan</SaasSecondaryCta>
      </SaasPageHero>

      <SaasSection className="bg-bone pb-12 pt-0 md:pb-16 md:pt-0">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-start lg:gap-16">
          <div>
            <p className="text-sm font-medium text-espresso">On the call we cover</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {DEMO_FEATURES.map((item) => (
                <li key={item.title} className="rounded-[1.75rem] border border-line bg-paper p-4 text-sm">
                  <p className="font-medium text-espresso">{item.title}</p>
                  <p className="mt-1 text-ink">{item.desc}</p>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-muted">{trial}</p>
          </div>
          <div id="demo-form" className="scroll-mt-28">
            <DemoOnboardingForm />
          </div>
        </div>
      </SaasSection>
    </div>
  );
}
