import Link from "next/link";

import {
  LAUNCH_PRICING,
  PRICING_FAQ,
  PRICING_INCLUDED_FEATURES,
  PRICING_PLANS,
} from "@/lib/marketing/pricing-plans";
import { marketingCopy } from "@/lib/marketing/copy";

import { SaasFaqAccordion } from "./SaasFaqAccordion";
import { SaasIcon } from "./SaasIcon";
import { SaasOwnerComparison } from "./SaasOwnerComparison";
import { SaasPageHero } from "./SaasPageHero";

export function SaasPricingPage() {
  return (
    <>
      <SaasPageHero
        eyebrow="Pricing"
        title={marketingCopy.pricing.lead}
        description={`${marketingCopy.pricing.subline} ${marketingCopy.pricing.feeLine}`}
      />

      <section className="px-6 pb-4">
        {LAUNCH_PRICING.active ? (
          <p className="mx-auto mb-8 max-w-xl text-center text-sm font-medium text-[#094413]">
            {LAUNCH_PRICING.label}: {LAUNCH_PRICING.detail}
          </p>
        ) : null}
        <div className="mx-auto grid max-w-[83rem] gap-8 md:grid-cols-2">
          {PRICING_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-3xl border p-8 md:p-10 ${
                plan.highlight
                  ? "border-[#088924] bg-white shadow-xl ring-2 ring-[#088924]/15"
                  : "border-[#2c2c2c]/10 bg-[#fbf8f5]"
              }`}
            >
              {plan.badge ? (
                <span className="font-mono-brand mb-4 inline-block rounded-full bg-[#088924]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#088924]">
                  {plan.badge}
                </span>
              ) : null}
              <h2 className="font-heading text-2xl font-semibold text-[#2c2c2c]">{plan.name}</h2>
              <p className="mt-2 text-sm text-[#2c2c2c]/70">{plan.description}</p>
              <p className="mt-6 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-heading text-5xl font-semibold tracking-tight text-[#094413]">${plan.priceMonthly}</span>
                <span className="text-sm text-[#2c2c2c]/60">/ month</span>
              </p>
              <p className="mt-2 text-sm font-medium text-[#088924]">{plan.priceNote}</p>
              <Link
                href={`/signup?plan=${plan.id}`}
                className={`mt-8 flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  plan.highlight
                    ? "bg-[#094413] text-[#fbf8f5] hover:bg-[#088924]"
                    : "border border-[#2c2c2c]/15 bg-white text-[#094413] hover:bg-[#f9f3ed]"
                }`}
              >
                {marketingCopy.cta.startTrial}
              </Link>
              <p className="mt-3 text-center text-xs text-[#2c2c2c]/50">No long-term contract · Cancel anytime</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-[#2c2c2c]/55">
          Built to cost less than typical all-in-one platforms like Owner.com ($249–$499/mo).
        </p>
      </section>

      <SaasOwnerComparison />

      <section className="bg-[#fbf8f5] px-6 py-20 md:py-24">
        <div className="mx-auto max-w-[83rem]">
          <h2 className="font-heading mb-10 text-center text-3xl font-semibold tracking-tight text-[#2c2c2c] md:text-4xl">
            Everything included on both plans
          </h2>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PRICING_INCLUDED_FEATURES.map((f) => (
              <li key={f.title} className="rounded-2xl border border-[#2c2c2c]/8 bg-white p-5">
                <div className="mb-2 flex items-center gap-2">
                  <SaasIcon icon="solar:verified-check-linear" className="text-lg text-[#088924]" />
                  <h3 className="font-heading text-sm font-semibold text-[#094413]">{f.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-[#2c2c2c]/75">{f.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <SaasFaqAccordion title="Pricing questions" items={PRICING_FAQ} />

      <section className="px-6 py-20 text-center">
        <p className="font-mono-brand text-xs font-semibold uppercase tracking-wider text-[#088924]">
          {marketingCopy.pricing.closingEyebrow}
        </p>
        <h2 className="font-heading mt-3 text-2xl font-semibold text-[#2c2c2c] md:text-3xl">
          {marketingCopy.pricing.closingHeadline}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-[#2c2c2c]/70">{marketingCopy.auditSubline}</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#2c2c2c]/55">{marketingCopy.closingSuggestive}</p>
        <Link
          href="/#audit-form"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-[#094413] px-8 text-sm font-semibold text-[#fbf8f5] hover:bg-[#088924]"
        >
          {marketingCopy.cta.aiReport}
        </Link>
      </section>
    </>
  );
}
