import type { Metadata } from "next";
import Link from "next/link";
import { SaasPageHero, SaasPrimaryCta } from "@/components/marketing/saas/SaasPageHero";
import { SaasSection } from "@/components/marketing/saas/SaasSection";
import { trialPromise } from "@/lib/billing/trial-days";
import { getVisitorFoundingPrice } from "@/lib/billing/visitor-region";
import {
  FEATURE_STATUS,
  PUBLIC_FEATURES,
  READINESS_LABEL,
  type FeatureReadiness,
} from "@/lib/marketing/feature-status";

export const metadata: Metadata = {
  title: "Product | KOB — The AI Restaurant Manager",
  description:
    "KOB checks your Google listing, reviews and website, drafts the fixes, and waits for your yes. Then it checks the change went live.",
};

const ORDER: FeatureReadiness[] = ["live", "beta", "gated", "roadmap"];

const CONNECTING = [
  "Square",
  "Epos Now",
  "Zettle",
  "ResDiary",
  "Xero",
  "QuickBooks",
];

export default async function ProductHubPage() {
  const price = await getVisitorFoundingPrice();
  const groups = ORDER.map((status) => ({
    status,
    label: READINESS_LABEL[status],
    items: PUBLIC_FEATURES.filter((item) => FEATURE_STATUS[item.key] === status),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      <SaasPageHero
        variant="inset"
        eyebrow="Product"
        title="The AI restaurant manager."
        description="You tap approve. KOB checks the change is live. Keep your website, your till and your booking system."
      >
        <SaasPrimaryCta href="/onboard">Find my restaurant</SaasPrimaryCta>
      </SaasPageHero>

      <SaasSection id="status" className="bg-cream">
        <h2 className="font-display mb-8 text-headline font-medium text-espresso">Where each job stands</h2>
        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.status}>
              <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-muted">{group.label}</h3>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {group.items.map((item) => (
                  <li key={item.key} className="rounded-[1.75rem] border border-line bg-paper p-6">
                    <h4 className="font-medium text-espresso">{item.title}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-ink">{item.line}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <section>
            <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Connecting</h3>
            <p className="mt-4 text-ink">
              {CONNECTING.join(", ")}. Listed here until each one is live. No logos until then.
            </p>
          </section>
        </div>
        <p className="mt-10 text-center text-sm text-muted">
          {price.label}/mo founding · {trialPromise()} ·{" "}
          <Link href="/pricing" className="underline underline-offset-2">
            Pricing
          </Link>
          {" · "}
          <Link href="/roadmap" className="underline underline-offset-2">
            Roadmap
          </Link>
        </p>
      </SaasSection>
    </>
  );
}
