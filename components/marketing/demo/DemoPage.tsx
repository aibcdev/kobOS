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
    title: "Free AI report",
    desc: "Website, Google, photos, and reviews—scored in about a minute.",
  },
  {
    title: "Website & SEO",
    desc: "What to fix on pages, menus, and local search so sales show up online.",
  },
  {
    title: "Direct ordering paths",
    desc: "Clear book-and-order flows so margin stays with you.",
  },
  {
    title: "Reviews & reputation",
    desc: "Gaps competitors exploit—and how to close them.",
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
          "Book a walkthrough of KOB—websites, SEO, and direct ordering for restaurants. Start with a free AI report, " +
          "then see the fixes your team can ship this week."
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
