import Link from "next/link";

import { WEBSITE_GROWTH_TABS, WEBSITE_SALES_TABS } from "@/lib/marketing/pillar-benefit-tabs";
import { marketingCopy } from "@/lib/marketing/copy";

import { SaasBenefitTabs } from "./SaasBenefitTabs";
import { SaasFaqAccordion } from "./SaasFaqAccordion";
import { SaasPageHero } from "./SaasPageHero";
import { SaasTrustBand } from "./SaasTrustBand";

const WEBSITE_FAQ = [
  {
    q: "Do I need a developer?",
    a: "No. KOB builds and hosts your site. You approve content; we handle structure, speed, and SEO basics.",
  },
  {
    q: "Can I keep my domain?",
    a: "Yes. Point your existing domain to KOB or we help you connect a new one during setup.",
  },
  {
    q: "How is this different from a template builder?",
    a: "Pages are built for hospitality conversion—menus, ordering, local SEO, and ongoing fixes from your AI visibility scan.",
  },
  {
    q: "What if I already use a delivery app?",
    a: "Keep apps for discovery. KOB gives you a direct channel so repeat guests order on your brand—not a marketplace.",
  },
] as const;

export function SaasWebsiteFeaturePage() {
  return (
    <>
      <SaasPageHero
        eyebrow="AI website"
        title="Restaurant websites built to win search—and direct orders"
        description="Pages, menus, and CTAs structured the way guests actually decide. Mobile-first, fast, and tied to your free visibility scan."
      />

      <SaasBenefitTabs
        eyebrow="Built for sales"
        title="Designed to turn traffic into orders"
        subtitle="Layouts tested across hundreds of independent venues—not generic brochure sites."
        tabs={WEBSITE_SALES_TABS}
        variant="underline"
      />

      <SaasBenefitTabs
        eyebrow="Built to grow"
        title="Your site keeps working for you after launch"
        subtitle="SEO, ordering, and AI priorities stay aligned as your business changes."
        tabs={WEBSITE_GROWTH_TABS}
        variant="pills"
      />

      <SaasTrustBand />

      <section className="bg-[#094413] px-6 py-20 text-center text-[#fbf8f5]">
        <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">{marketingCopy.heroHeadline}</h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-white/85 md:text-base">{marketingCopy.heroSubline}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/#audit-form"
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
