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
  title: "Brand & guest experience | KOB",
  description:
    "Brand, food photography, and guest experience online—so your website sells as hard as your dining room.",
};

export default function BrandingFeaturePage() {
  return (
    <>
      <SaasPageHero
        eyebrow="Brand & experience"
        title="Your brand should sell online—not just in the room."
        description="Guests decide before they walk in. KOB scores photos, pages, and reviews—then shows what to fix so online sales match the experience inside."
        variant="warm"
      >
        <SaasPrimaryCta href="/demo">Get started</SaasPrimaryCta>
        <SaasSecondaryCta href="/audit">Free scan</SaasSecondaryCta>
      </SaasPageHero>

      <SaasSection className="border-b border-[#2c2c2c]/5 bg-[#fbf8f5] pb-10 md:pb-14 pt-0 -mt-[1px]">
        <div className="relative aspect-[16/10] max-w-5xl overflow-hidden rounded-2xl border border-[#2c2c2c]/10 shadow-sm">
          <Image
            src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1200&auto=format&fit=crop"
            alt="Branded dining"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 896px"
            priority
          />
        </div>
      </SaasSection>

      <SaasSection className="bg-[#fbf8f5]">
        <h2 className="mb-4 text-center font-head text-3xl font-medium tracking-tight text-[#2c2c2c] md:text-4xl">
          An experience that feels like you
        </h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-[#2c2c2c]/75">
          Showcase your brand from first search to confirmation—without handing the story to third-party marketplaces.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              t: "Consistent voice",
              d: "Menus, landing pages, and promos read as one brand—not three different agencies.",
            },
            {
              t: "Promote what matters",
              d: "Highlight events, new menus, or retail—where guests already lean in to book or order.",
            },
            {
              t: "Own the journey",
              d: "Clear paths to direct reservations and orders so margin stays with you.",
            },
          ].map((c) => (
            <div key={c.t} className="rounded-2xl border border-[#2c2c2c]/10 bg-white p-8">
              <h3 className="mb-3 text-lg font-semibold text-[#2c2c2c]">{c.t}</h3>
              <p className="text-sm leading-relaxed text-[#2c2c2c]/75">{c.d}</p>
            </div>
          ))}
        </div>
      </SaasSection>

      <SaasSection className="border-t border-[#2c2c2c]/10 bg-[#f9f3ed] text-center">
        <h2 className="mb-6 font-head text-3xl font-medium text-[#2c2c2c]">Your brand. Your design. Your decision.</h2>
        <p className="mx-auto mb-10 max-w-2xl text-[#2c2c2c]/75">
          KOB pairs AI drafts with your guardrails so teams can ship faster without losing what makes the venue special.
        </p>
        <Link
          href="/pricing"
          className="inline-flex h-12 items-center rounded-full border border-[#094413]/20 bg-white px-8 text-sm font-medium text-[#094413] transition-colors hover:border-[#094413]/40 hover:bg-[#094413]/5"
        >
          See pricing
        </Link>
      </SaasSection>
    </>
  );
}
