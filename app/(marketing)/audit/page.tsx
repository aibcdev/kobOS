import type { Metadata } from "next";
import { AuditBusinessSearch } from "@/components/marketing/audit/AuditBusinessSearch";
import { SaasPageHero } from "@/components/marketing/saas/SaasPageHero";
import { SaasSection } from "@/components/marketing/saas/SaasSection";
import { marketingCopy } from "@/lib/marketing/copy";

export const metadata: Metadata = {
  title: "Free AI report · KOB",
  description:
    "You're losing sales online. Use AI to see what to fix—website, SEO, photos, and reviews scored in about a minute.",
};

const INSIGHTS = [
  { quote: "Food photos quietly costing 40% of online orders.", tag: "Website experience" },
  { quote: "Missing local keywords worth 800+ monthly searches.", tag: "SEO" },
  { quote: "Slow mobile site bleeding sales before guests ever book.", tag: "Performance" },
] as const;

export default function AuditPage() {
  return (
    <>
      <SaasPageHero
        eyebrow={marketingCopy.trustLine}
        title={`${marketingCopy.losingSalesOnline} ${marketingCopy.useAiToFix}`}
        description={marketingCopy.auditSubline}
      />

      <SaasSection className="bg-[#f9f3ed] pb-8 pt-0">
        <div className="mx-auto max-w-[42rem]">
          <AuditBusinessSearch />
        </div>
      </SaasSection>

      <SaasSection className="bg-[#fbf8f5]">
        <p className="font-heading text-center text-xl font-semibold text-[#2c2c2c] md:text-2xl">
          What the AI report surfaces for restaurants like yours
        </p>
        <ul className="mt-8 grid gap-4 md:gap-5">
          {INSIGHTS.map((item) => (
            <li
              key={item.tag}
              className="rounded-3xl border border-[#2c2c2c]/10 bg-[#f9f3ed] px-6 py-5 text-left"
            >
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#088924]">{item.tag}</span>
              <p className="font-heading mt-2 text-lg font-medium leading-snug text-[#2c2c2c] md:text-xl">
                &ldquo;{item.quote}&rdquo;
              </p>
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-12 max-w-lg text-center text-base leading-relaxed text-[#2c2c2c]/75 md:text-lg">
          Your room sells the experience.{" "}
          <span className="font-medium text-[#2c2c2c]">Your website should sell it just as hard online.</span>
        </p>
      </SaasSection>
    </>
  );
}
