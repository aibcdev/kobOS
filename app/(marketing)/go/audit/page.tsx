import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/page-metadata";
import { AuditBusinessSearch } from "@/components/marketing/audit/AuditBusinessSearch";
import { SaasAuditWhatWeCheck } from "@/components/marketing/saas/SaasAuditWhatWeCheck";
import { SaasPageHero } from "@/components/marketing/saas/SaasPageHero";
import { SaasSection } from "@/components/marketing/saas/SaasSection";
import { TimeCostCalculator } from "@/components/marketing/audit/TimeCostCalculator";
import { getVisitorFoundingPrice } from "@/lib/billing/visitor-region";
import { marketingCopy } from "@/lib/marketing/copy";
import { OWNER_QUESTIONS } from "@/lib/marketing/feature-status";

/**
 * The free restaurant audit: the one indexed audit page (/audit redirects to the /scan search box, which is noindex).
 * Also the landing for ads and outbound emails.
 */
export const metadata: Metadata = pageMetadata({
  title: "Free restaurant marketing audit",
  description:
    "Free scan of your restaurant website, Google listing, and reviews. See where guests drop off, then get a clear list of what to fix. No card.",
  path: "/go/audit",
});

const INSIGHTS = marketingCopy.auditInsights;

export default async function GoAuditAdsLandingPage() {
  const price = await getVisitorFoundingPrice();
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
          What we&apos;d typically fix this week
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-[#2c2c2c]/70">
          After the scan, KOB proposes a short approve-only list — hours, photos, review replies, Google listing
          gaps — not a replatform of your website or ordering.
        </p>
        <ul className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
          {[
            "Wrong or missing Google hours before a bank holiday",
            "Unanswered 1–3★ reviews that still show on Maps",
            "Stale cover photos vs what guests see in-room",
            "Website paths that bury book / order / call",
          ].map((item) => (
            <li
              key={item}
              className="rounded-2xl border border-[#2c2c2c]/10 bg-white px-5 py-4 text-left text-sm leading-relaxed text-[#2c2c2c]/85"
            >
              {item}
            </li>
          ))}
        </ul>
      </SaasSection>

      <SaasSection className="bg-[#fbf8f5]">
        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
          <TimeCostCalculator priceLabel={price.label} currency={price.currency === "gbp" ? "£" : "$"} />
          <div className="rounded-3xl border border-[#2c2c2c]/10 bg-white p-6 md:p-8">
            <h2 className="font-heading text-2xl font-semibold text-[#2c2c2c]">Two questions owners ask</h2>
            <dl className="mt-6 space-y-5">
              {OWNER_QUESTIONS.map((item) => (
                <div key={item.q}>
                  <dt className="font-medium text-[#2c2c2c]">{item.q}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-[#2c2c2c]/75">{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </SaasSection>

      <SaasSection className="bg-[#f9f3ed]">
        <p className="font-heading text-center text-xl font-semibold text-[#2c2c2c] md:text-2xl">
          What the free scan surfaces for restaurants like yours
        </p>
        <ul className="mt-8 grid gap-4 md:gap-5">
          {INSIGHTS.map((item) => (
            <li
              key={item.tag}
              className="rounded-3xl border border-[#2c2c2c]/10 bg-white px-6 py-5 text-left"
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
        <p className="mx-auto mt-6 text-center">
          <a
            href="/onboard"
            className="inline-flex h-12 items-center rounded-full bg-[#094413] px-6 text-sm font-semibold text-white hover:bg-[#088924]"
          >
            Or skip ahead — Try KOB free
          </a>
        </p>
      </SaasSection>
    </>
  );
}
