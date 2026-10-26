import type { Metadata } from "next";
import Link from "next/link";

import { trialPromise } from "@/lib/billing/trial-days";
import { getVisitorFoundingPrice } from "@/lib/billing/visitor-region";
import { SaasPageHero, SaasPrimaryCta, SaasSecondaryCta } from "@/components/marketing/saas/SaasPageHero";
import { SaasSection } from "@/components/marketing/saas/SaasSection";
import { FREE_TRIAL_LABEL, TRIAL_DAYS, TRIAL_DAYS_FREE } from "@/lib/billing/offer";
import { POSTING } from "@/lib/marketing/feature-status";

export const metadata: Metadata = {
  title: `${FREE_TRIAL_LABEL} | KOB — The Restaurant Manager for Owners`,
  description:
    `${TRIAL_DAYS_FREE}. No card. KOB drafts review replies and listing fixes. You approve and post in one tap. Nothing goes out without your OK.`,
};

const INCLUDED = [
  {
    title: "Reviews",
    detail:
      `${POSTING.reviews} Bad reviews always wait for you.`,
  },
  {
    title: "Google listing",
    detail: `Hours and holiday closures checked against your website. ${POSTING.listing}`,
  },
  {
    title: "Website",
    detail: "Wrong hours, broken booking buttons, placeholder text. In beta.",
  },
  {
    title: "Morning brief",
    detail: "What needs you today, in two minutes.",
  },
  {
    title: "More reviews",
    detail: POSTING.reviewKit,
  },
];

const steps = (priceLabel: string) => [
  { n: "01", title: "Find your restaurant", body: "No card. KOB reads the public listing, reviews and website." },
  { n: "02", title: "Get the morning brief", body: "What needs you today, with every reply and fix already drafted." },
  {
    n: "03",
    title: "Approve, tap once, post",
    body: `${POSTING.control} After the week, founding is ${priceLabel} a location if you stay.`,
  },
];

export default async function TrialPage() {
  const price = await getVisitorFoundingPrice();
  const trial = trialPromise();
  return (
    <>
      <SaasPageHero
        variant="inset"
        eyebrow={trial}
        title={`Try KOB free for ${TRIAL_DAYS} days. No card.`}
        description="Start with reviews and your Google listing. You approve every change and post it in one tap."
      >
        <SaasPrimaryCta href="/onboard">Find my restaurant</SaasPrimaryCta>
        <SaasSecondaryCta href="/login?mode=signup">I already have an account</SaasSecondaryCta>
      </SaasPageHero>

      <SaasSection className="bg-cream">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <h2 className="font-display text-headline font-medium text-espresso">What you get for {TRIAL_DAYS} days</h2>
            <ul className="mt-8 space-y-4">
              {INCLUDED.map((item) => (
                <li key={item.title} className="rounded-[1.75rem] border border-line bg-paper p-5">
                  <h3 className="font-medium text-espresso">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink">{item.detail}</p>
                </li>
              ))}
            </ul>
          </div>

          <aside className="rounded-[1.75rem] bg-espresso p-8 text-paper">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-paper/60">After the week</p>
            <p className="font-display mt-4 text-5xl font-medium tracking-tight">{price.label}</p>
            <p className="mt-1 text-sm text-paper/70">per location / month · founding</p>
            <p className="mt-6 text-sm leading-relaxed text-paper/85">
              Keep this rate while you stay subscribed. If you add no card, the trial ends. We do not charge a card you never added.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-paper/85">
              <li>No card to start</li>
              <li>{trial}</li>
            </ul>
            <Link
              href="/onboard"
              className="mt-8 flex h-12 items-center justify-center rounded-full bg-paper text-sm font-semibold text-espresso hover:bg-cream"
            >
              Find my restaurant
            </Link>
          </aside>
        </div>
      </SaasSection>

      <SaasSection>
        <h2 className="font-display text-headline font-medium text-espresso">How the week starts</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {steps(price.label).map((step) => (
            <li key={step.n} className="rounded-[1.75rem] border border-line bg-paper p-6">
              <p className="text-xs font-medium tracking-[0.14em] text-muted">{step.n}</p>
              <h3 className="mt-3 text-lg font-medium text-espresso">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink">{step.body}</p>
            </li>
          ))}
        </ol>
      </SaasSection>
    </>
  );
}
