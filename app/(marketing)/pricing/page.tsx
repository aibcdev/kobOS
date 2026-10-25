import type { Metadata } from "next";
import Link from "next/link";

import { FOUNDING_PRICE_LINE, TRIAL_DAYS_FREE } from "@/lib/billing/offer";
import { getVisitorFoundingPrice } from "@/lib/billing/visitor-region";
import { FOUNDING_PRICES } from "@/lib/billing/regional-pricing";
import { trialPromise } from "@/lib/billing/trial-days";
import {
  LAUNCH_PRICING,
  OWNER_COMPARISON,
  pricingFaq,
  pricingIncludedFeatures,
} from "@/lib/marketing/pricing-plans";
import { SaasFaqAccordion } from "@/components/marketing/saas/SaasFaqAccordion";
import { SaasPageHero } from "@/components/marketing/saas/SaasPageHero";

export const metadata: Metadata = {
  title: "Pricing | KOB — The Restaurant Manager for Owners",
  description:
    `Founding price per location — ${FOUNDING_PRICE_LINE}. ${TRIAL_DAYS_FREE}, no card. You approve. KOB checks it is live.`,
};

export default async function PricingPage() {
  const price = await getVisitorFoundingPrice();
  return (
    <>
      <SaasPageHero
        eyebrow="Pricing"
        title="One price. One manager. Per location."
        description={`${LAUNCH_PRICING.label}. ${trialPromise()}. ${FOUNDING_PRICES.GB.label} in the UK, ${FOUNDING_PRICES.US.label} elsewhere.`}
      />

      <section className="px-6 pb-4">
        <div className="mx-auto max-w-lg rounded-3xl border border-[#088924] bg-white p-8 shadow-xl ring-2 ring-[#088924]/15 md:p-10">
          <span className="mb-4 inline-block rounded-full bg-[#088924]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#088924]">
            Founding
          </span>
          <h2 className="font-heading text-2xl font-semibold text-[#2c2c2c]">Your restaurant manager</h2>
          <p className="mt-2 text-sm text-ink">
            Reviews, your Google listing and your website. You tap approve. KOB checks the change went live.
          </p>
          <p className="mt-6 flex flex-wrap items-baseline gap-x-2">
            <span className="font-heading text-5xl font-semibold tracking-tight text-[#094413]">{price.label}</span>
            <span className="text-sm text-[#2c2c2c]/60">/ location / month</span>
          </p>
          <p className="mt-2 text-sm font-medium text-[#088924]">Keep this rate while subscribed</p>
          <Link
            href="/trial"
            className="mt-8 flex h-12 w-full items-center justify-center rounded-full bg-[#094413] text-sm font-semibold text-[#fbf8f5] hover:bg-[#088924]"
          >
            Try KOB free
          </Link>
          <p className="mt-3 text-center text-xs text-muted">{trialPromise()}</p>
          <p className="mt-2 text-center text-sm text-ink">
            {FOUNDING_PRICES.GB.label} in the UK · {FOUNDING_PRICES.US.label} elsewhere
          </p>
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted">
          Keep your website and your till. Owner.com public pricing as of 19 Oct 2026:{" "}
          {OWNER_COMPARISON.ownerFlexNote}; {OWNER_COMPARISON.ownerFlatNote}.
        </p>
      </section>

      <section className="bg-[#fbf8f5] px-6 py-20 md:py-24">
        <div className="mx-auto max-w-[83rem]">
          <h2 className="font-heading mb-10 text-center text-3xl font-semibold tracking-tight text-[#2c2c2c]">
            What founding includes
          </h2>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pricingIncludedFeatures(price.label).map((f) => (
              <li key={f.title} className="rounded-2xl border border-[#2c2c2c]/8 bg-white p-5">
                <h3 className="font-heading text-sm font-semibold text-[#094413]">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#2c2c2c]/75">{f.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <SaasFaqAccordion title="FAQ" items={pricingFaq(price.label)} />
        </div>
      </section>
    </>
  );
}
