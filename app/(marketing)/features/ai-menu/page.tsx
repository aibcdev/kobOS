import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import {
  SaasPageHero,
  SaasPrimaryCta,
  SaasSecondaryCta,
} from "@/components/marketing/saas/SaasPageHero";
import { SaasSection } from "@/components/marketing/saas/SaasSection";

export const metadata: Metadata = {
  title: "AI-powered menus | KOB",
  description:
    "Digital menus and SEO that turn search into orders—structured for hungry guests and easy for your team to run.",
};

export default function AiMenuFeaturePage() {
  return (
    <>
      <SaasPageHero
        eyebrow="Digital menus"
        title="Menus that rank—and convert."
        description="Structure dishes for high-intent searches. Surface add-ons and dietary clarity. Keep mobile fast so online sales go to you—not the app next door."
        variant="warm"
      >
        <SaasPrimaryCta href="/demo">Get started</SaasPrimaryCta>
        <SaasSecondaryCta href="/product">Product overview</SaasSecondaryCta>
      </SaasPageHero>

      <SaasSection className="border-b border-[#2c2c2c]/5 bg-[#fbf8f5] pb-10 md:pb-14 pt-0 -mt-[1px]">
        <div className="relative aspect-[16/10] max-w-5xl overflow-hidden rounded-2xl border border-[#2c2c2c]/10 shadow-sm">
          <Image
            src="https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200&auto=format&fit=crop"
            alt="Food menu context"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 896px"
            priority
          />
        </div>
      </SaasSection>

      <SaasSection id="menus" className="scroll-mt-24 bg-white">
        <h2 className="mb-4 font-head text-3xl font-medium tracking-tight text-[#2c2c2c] md:text-4xl">
          Would you like any extras for the table?
        </h2>
        <p className="mb-12 max-w-2xl text-[#2c2c2c]/75">
          Digital menus give you room to upsell without awkward table-side scripts—while keeping allergens and modifiers
          obvious.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          {[
            { t: "Upsell with context", d: "Suggest pairings and add-ons that match the dish—not generic bundles." },
            { t: "Better guest experience", d: "Fast loads, clear sections, and language that feels native to your brand." },
            { t: "Easier operations", d: "One place to update dishes, prices, and promos when the kitchen changes course." },
            { t: "Less waste", d: "Fewer printed sheets and fewer out-of-date PDFs floating around online." },
          ].map((c) => (
            <div key={c.t} className="rounded-2xl border border-[#2c2c2c]/10 bg-[#f9f3ed] p-8">
              <h3 className="mb-3 text-lg font-semibold text-[#2c2c2c]">{c.t}</h3>
              <p className="text-sm text-[#2c2c2c]/75">{c.d}</p>
            </div>
          ))}
        </div>
      </SaasSection>

      <SaasSection className="border-t border-[#2c2c2c]/10 bg-[#094413] text-center text-[#fbf8f5]">
        <h2 className="mb-4 font-head text-2xl font-medium md:text-3xl">Upgrade your digital menu</h2>
        <p className="mx-auto mb-8 max-w-xl text-[#fbf8f5]/90">
          Pair menu work with Growth Agent priorities so you fix what moves covers first.
        </p>
        <Link
          href="/product"
          className="inline-flex h-12 items-center rounded-full bg-[#fbf8f5] px-8 text-sm font-medium text-[#094413] transition-colors hover:bg-[#f9f3ed]"
        >
          Back to product overview
        </Link>
      </SaasSection>
    </>
  );
}
