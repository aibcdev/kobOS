import type { Metadata } from "next";
import { AuditBusinessSearch } from "@/components/marketing/audit/AuditBusinessSearch";
import { SaasAuditWhatWeCheck } from "@/components/marketing/saas/SaasAuditWhatWeCheck";
import { SaasPageHero } from "@/components/marketing/saas/SaasPageHero";
import { SaasSection } from "@/components/marketing/saas/SaasSection";
import { marketingCopy } from "@/lib/marketing/copy";

/**
 * Dedicated Google Ads / paid landing for the free restaurant audit.
 * Canonical product path remains /audit — this URL is for campaigns only.
 */
export const metadata: Metadata = {
  title: "Free restaurant marketing audit · KOB",
  description:
    "Free scan of your restaurant website, Google listing, and reviews. See where guests drop off — then get a clear list of what to fix. No card.",
  openGraph: {
    title: "Free restaurant marketing audit · KOB",
    description:
      "Free scan of your website, Google listing, and reviews. See what’s costing you customers online.",
    url: "https://trykob.com/go/audit",
  },
  alternates: {
    canonical: "https://trykob.com/go/audit",
  },
  robots: { index: true, follow: true },
};

const INSIGHTS = marketingCopy.auditInsights;

export default function GoAuditAdsLandingPage() {
  return (
    <>
      <SaasPageHero
        eyebrow="Free restaurant audit · 1 minute · No card"
        title="See what’s costing you customers online"
        description="Scan your website, Google listing, and reviews. Get a clear list of fixes — nothing goes live without you."
      />

      <SaasSection className="bg-[#f9f3ed] pb-8 pt-0">
        <div className="mx-auto max-w-[42rem]">
          <AuditBusinessSearch />
        </div>
      </SaasSection>

      <SaasAuditWhatWeCheck />

      <SaasSection className="bg-[#fbf8f5]">
        <p className="font-heading text-center text-xl font-semibold text-[#2c2c2c] md:text-2xl">
          What the free scan surfaces for restaurants like yours
        </p>
        <ul className="mt-8 grid gap-4 md:gap-5">
          {INSIGHTS.map((item) => (
            <li
              key={item.tag}
              className="rounded-3xl border border-[#2c2c2c]/10 bg-[#f9f3ed] px-6 py-5 text-left"
            >
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#088924]">
                {item.tag}
              </span>
              <p className="font-heading mt-2 text-lg font-medium leading-snug text-[#2c2c2c] md:text-xl">
                &ldquo;{item.quote}&rdquo;
              </p>
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-12 max-w-lg text-center text-base leading-relaxed text-[#2c2c2c]/75 md:text-lg">
          Enter your restaurant name or website above. Results in about a minute.
        </p>
      </SaasSection>
    </>
  );
}
