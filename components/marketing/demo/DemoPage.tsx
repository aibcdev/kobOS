import { DemoOnboardingForm } from "@/components/marketing/demo/DemoOnboardingForm";
import {
  SaasPageHero,
  SaasPrimaryCta,
  SaasSecondaryCta,
} from "@/components/marketing/saas/SaasPageHero";
import { SaasSection } from "@/components/marketing/saas/SaasSection";
import { marketingCopy } from "@/lib/marketing/copy";

const DEMO_FEATURES = [
  {
    title: "Free scan",
    desc: "Website, Google listing, photos, and reviews — about a minute. No card.",
  },
  {
    title: "Daily approve list",
    desc: "Hours, holidays, review replies, posts — nothing publishes without you.",
  },
  {
    title: "We do not replace your POS",
    desc: "No kitchen tablet, branded guest app, or marketplace. Owner.com does that stack; we don’t.",
  },
  {
    title: "UK independents",
    desc: "Built for single-site owners who want tables from Google and reviews, not a US-only suite.",
  },
] as const;

export function DemoPage() {
  return (
    <div className="min-h-screen bg-[#fbf8f5]">
      <SaasPageHero
        eyebrow={marketingCopy.trustLine}
        variant="inset"
        title={`${marketingCopy.losingSalesOnline} ${marketingCopy.useAiToFix}`}
        description={
          "Talk through your Google listing, reviews, and daily approve list. We do not replace your POS or launch a branded app. Self-serve scan stays on /audit — this call is for Owner.com-comparison shoppers and multi-site questions."
        }
      >
        <SaasPrimaryCta href="#demo-form">Get started</SaasPrimaryCta>
        <SaasSecondaryCta href="/audit">Free scan</SaasSecondaryCta>
      </SaasPageHero>

      <SaasSection className="bg-[#fbf8f5] pb-12 pt-0 md:pb-16 md:pt-0 lg:pb-20">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-start lg:gap-16">
          <div className="flex flex-col gap-8 lg:sticky lg:top-24">
            <div>
              <p className="text-sm font-semibold text-[#2c2c2c]">On your demo journey, we cover</p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {DEMO_FEATURES.map((f) => (
                  <li
                    key={f.title}
                    className="rounded-2xl border border-[#2c2c2c]/10 bg-white/80 p-4 text-sm shadow-sm"
                  >
                    <span className="text-[#088924]" aria-hidden>
                      ⚡
                    </span>
                    <p className="mt-2 font-semibold text-[#2c2c2c]">{f.title}</p>
                    <p className="mt-1 text-[#2c2c2c]/70">{f.desc}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-[#2c2c2c]/65">
              <span className="rounded-lg border border-[#2c2c2c]/10 bg-white px-3 py-2">Free AI report · No card</span>
              <span className="rounded-lg border border-[#2c2c2c]/10 bg-white px-3 py-2">
                7-day trial available
              </span>
            </div>
          </div>

          <div id="demo-form" className="flex scroll-mt-28 justify-center lg:justify-end">
            <DemoOnboardingForm />
          </div>
        </div>
      </SaasSection>
    </div>
  );
}
