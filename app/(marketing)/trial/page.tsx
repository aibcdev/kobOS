import type { Metadata } from "next";
import Link from "next/link";

import { getVisitorFoundingPrice } from "@/lib/billing/visitor-region";
import { SaasPageHero, SaasPrimaryCta, SaasSecondaryCta } from "@/components/marketing/saas/SaasPageHero";
import { SaasSection } from "@/components/marketing/saas/SaasSection";

export const metadata: Metadata = {
  title: "7-day free trial | KOB — The AI Restaurant Manager",
  description:
    "Every restaurant gets a 7-day KOB trial. No card. Google, reviews, hours, costs, and prep — you approve before anything public.",
};

const INCLUDED = [
  {
    title: "Morning brief",
    detail: "What needs you today — hours, reviews, and cost flags from what is actually connected.",
  },
  {
    title: "Hours and reviews",
    detail: "KOB drafts the change. Nothing posts to Google until you approve and it can be verified.",
  },
  {
    title: "Cost Watch",
    detail: "Invoice price moves when invoices are connected. No invented savings.",
  },
  {
    title: "Prep notes",
    detail: "Quantities when sales data exists. If the till is not connected, KOB says so.",
  },
];

const steps = (priceLabel: string) => [
  { n: "01", title: "Start", body: "Name the restaurant. No card. Takes about a minute." },
  { n: "02", title: "KOB checks", body: "Public Google and your site first. Private systems only after you connect them." },
  { n: "03", title: "You approve", body: `Seven days to use Talk. Cancel anytime. After that, founding is ${priceLabel} a location.` },
];

export default async function TrialPage() {
  const price = await getVisitorFoundingPrice();
  return (
    <>
      <SaasPageHero
        variant="inset"
        eyebrow="7 days free · every restaurant"
        title="Try KOB for a week. No card."
        description="The same trial for everyone — independents, one site or a few. KOB runs the work around the restaurant. You decide what goes public."
      >
        <SaasPrimaryCta href="/onboard">Start 7-day trial</SaasPrimaryCta>
        <SaasSecondaryCta href="/login?next=%2Fonboard">I already have an account</SaasSecondaryCta>
      </SaasPageHero>

      <SaasSection className="bg-cream">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-[#2c2c2c]">
              What you get for 7 days
            </h2>
            <ul className="mt-8 space-y-4">
              {INCLUDED.map((item) => (
                <li key={item.title} className="rounded-2xl border border-[#2c2c2c]/8 bg-white p-5">
                  <h3 className="font-heading text-base font-semibold text-[#094413]">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#2c2c2c]/75">{item.detail}</p>
                </li>
              ))}
            </ul>
          </div>

          <aside className="rounded-3xl bg-[#094413] p-8 text-[#fbf8f5]">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#fbf8f5]/60">After the week</p>
            <p className="font-heading mt-4 text-5xl font-semibold tracking-tight">{price.label}</p>
            <p className="mt-1 text-sm text-[#fbf8f5]/70">per location / month · founding</p>
            <p className="mt-6 text-sm leading-relaxed text-[#fbf8f5]/85">
              Keep this rate while you stay subscribed. If you do nothing, the trial ends — we do not charge a card you never added.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-[#fbf8f5]/85">
              <li>No card to start</li>
              <li>Cancel anytime in the 7 days</li>
              <li>Phone answering is Coming next — not included as live</li>
            </ul>
            <Link
              href="/onboard"
              className="mt-8 flex h-12 items-center justify-center rounded-full bg-[#fbf8f5] text-sm font-semibold text-[#094413] hover:bg-white"
            >
              Start 7-day trial
            </Link>
            <p className="mt-4 text-center text-xs text-[#fbf8f5]/50">
              <Link href="/pricing" className="underline underline-offset-2 hover:text-[#fbf8f5]">
                Full pricing
              </Link>
            </p>
          </aside>
        </div>
      </SaasSection>

      <SaasSection>
        <h2 className="font-heading text-3xl font-semibold tracking-tight text-[#2c2c2c]">How the week starts</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {steps(price.label).map((step) => (
            <li key={step.n} className="rounded-2xl border border-[#2c2c2c]/8 bg-white p-6">
              <p className="text-xs font-medium tracking-[0.14em] text-[#088924]">{step.n}</p>
              <h3 className="font-heading mt-3 text-lg font-semibold text-[#2c2c2c]">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#2c2c2c]/75">{step.body}</p>
            </li>
          ))}
        </ol>
      </SaasSection>
    </>
  );
}
