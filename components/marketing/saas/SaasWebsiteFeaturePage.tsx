import Link from "next/link";

import { WEBSITE_GROWTH_TABS, WEBSITE_SALES_TABS } from "@/lib/marketing/pillar-benefit-tabs";
import { marketingCopy } from "@/lib/marketing/copy";

import { SaasBenefitTabs } from "./SaasBenefitTabs";
import { SaasFaqAccordion } from "./SaasFaqAccordion";
import { SaasPageHero } from "./SaasPageHero";
import { SaasTrustBand } from "./SaasTrustBand";

const WEBSITE_FAQ = [
  {
    q: "Does KOB build or host my website?",
    a: "No. KOB checks the website you already have, the way a guest would, and tells you what to fix: wrong hours, a broken booking button, placeholder text, a dead menu link.",
  },
  {
    q: "Do I need a developer?",
    a: "Not for most fixes. KOB says exactly what to change in plain English, and you or whoever looks after your site makes the change.",
  },
  {
    q: "Can I keep my website and domain?",
    a: "Yes. KOB works with the website and booking system you already have.",
  },
  {
    q: "Does KOB check Google against my website?",
    a: "Yes. Every morning KOB compares your Google hours, holiday hours and description with your website, and drafts the fix when they disagree. You approve and update it in a tap.",
  },
] as const;

export function SaasWebsiteFeaturePage() {
  return (
    <>
      <SaasPageHero
        eyebrow="Your online shop window"
        title="Guests judge you online before they walk in"
        description="We audit where you’re losing customers online, flag the highest-impact fixes, and put them on a list you approve. Start with a free audit."
      />

      <SaasBenefitTabs
        eyebrow="How KOB helps"
        title="Never miss a beat online"
        subtitle="Reviews, holidays, hours and posts, drafted for you to approve and post in one tap."
        tabs={WEBSITE_SALES_TABS}
        variant="underline"
      />

      <SaasBenefitTabs
        eyebrow="Every morning"
        title="Stop small things slipping"
        subtitle="KOB keeps checking your site and Google listing as things change, so guests see the right hours and menu."
        tabs={WEBSITE_GROWTH_TABS}
        variant="pills"
      />

      <SaasTrustBand />

      <section className="bg-[#094413] px-6 py-20 text-center text-[#fbf8f5]">
        <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">{marketingCopy.heroHeadline}</h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-white/85 md:text-base">{marketingCopy.heroSubline}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/audit"
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#fbf8f5] px-8 text-sm font-semibold text-[#094413] hover:bg-white"
          >
            {marketingCopy.cta.aiReport}
          </Link>
          <Link
            href="/pricing"
            className="inline-flex h-12 items-center justify-center rounded-full border border-white/30 px-8 text-sm font-semibold text-white hover:bg-white/10"
          >
            {marketingCopy.cta.viewPricing}
          </Link>
        </div>
      </section>

      <SaasFaqAccordion title="Website questions" items={WEBSITE_FAQ} />
    </>
  );
}
