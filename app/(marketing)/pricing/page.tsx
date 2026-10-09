import type { Metadata } from "next";
import Link from "next/link";

import { getVisitorFoundingPrice } from "@/lib/billing/visitor-region";
import {
  LAUNCH_PRICING,
  OWNER_COMPARISON,
  pricingFaq,
  pricingIncludedFeatures,
} from "@/lib/marketing/pricing-plans";
import { SaasFaqAccordion } from "@/components/marketing/saas/SaasFaqAccordion";
import { SaasPageHero } from "@/components/marketing/saas/SaasPageHero";

export const metadata: Metadata = {
  title: "Pricing | KOB — The AI Restaurant Manager",
  description:
    "Founding price per location — £79/mo in the UK, $99/mo elsewhere. 7-day trial, no card. KOB runs the work around your restaurant.",
};

export default async function PricingPage() {
  const price = await getVisitorFoundingPrice();
  return (
    <>
      <SaasPageHero
        eyebrow="Pricing"
        title="One manager. One founding price."
        description={`${LAUNCH_PRICING.label}: ${LAUNCH_PRICING.detail}`}
      />

      <section className="px-6 pb-4">
        <div className="mx-auto max-w-lg rounded-3xl border border-[#088924] bg-white p-8 shadow-xl ring-2 ring-[#088924]/15 md:p-10">
          <span className="mb-4 inline-block rounded-full bg-[#088924]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#088924]">
            Founding
          </span>
          <h2 className="font-heading text-2xl font-semibold text-[#2c2c2c]">AI restaurant manager</h2>
          <p className="mt-2 text-sm text-[#2c2c2c]/70">
            Google, reviews, hours, costs, and prep — you approve before anything public.
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
          <p className="mt-3 text-center text-xs text-[#2c2c2c]/50">7 days free · no card · cancel anytime</p>
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-[#2c2c2c]/55]">
          Built for independents who do not want an Owner.com-style POS swap. Owner public pricing as of
          2026-06-20: {OWNER_COMPARISON.ownerFlexNote}; {OWNER_COMPARISON.ownerFlatNote}.
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
