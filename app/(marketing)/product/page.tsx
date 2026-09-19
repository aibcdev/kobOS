import type { Metadata } from "next";
import Link from "next/link";
import { SaasPageHero, SaasPrimaryCta, SaasSecondaryCta } from "@/components/marketing/saas/SaasPageHero";
import { SaasSection } from "@/components/marketing/saas/SaasSection";

export const metadata: Metadata = {
  title: "Product | KOB — The AI Restaurant Manager",
  description:
    "KOB runs the work around your restaurant — Google, reviews, hours, costs, and prep. You approve. Nothing public until you say yes.",
};

const PILLARS = [
  {
    title: "Morning brief",
    description: "Hours mismatches, unanswered reviews, cost flags, and prep notes — ranked for today.",
  },
  {
    title: "Suggest → Approve → Autopilot",
    description: "You set what KOB may do alone. Public posts and hours only after verify — not fake Done.",
  },
  {
    title: "Cost Watch",
    description: "Inbox invoices first. Photo OCR when that is all you have. Unit-cost checks when data exists.",
  },
  {
    title: "Prep (BETA)",
    description: "Predictive quantities from weather and bookings when connected — not measured waste.",
  },
  {
    title: "KOB Phone",
    description: "Coming next. Join the beta waitlist. We do not claim live guest answering today.",
  },
  {
    title: "Memory & house rules",
    description: "Structured rules you confirm. No invented Friday discounts or restrictions.",
  },
];

export default function ProductHubPage() {
  return (
    <>
      <SaasPageHero
        variant="inset"
        eyebrow="Product"
        title="The AI restaurant manager — not another growth stack."
        description="Talk to KOB. Approve the work. Verify before Done. Built for independents who keep their till."
      >
        <SaasPrimaryCta href="/onboard">Try KOB free</SaasPrimaryCta>
        <SaasSecondaryCta href="/login">Talk to KOB</SaasSecondaryCta>
      </SaasPageHero>

      <SaasSection className="bg-cream">
        <h2 className="font-heading mb-8 text-2xl font-semibold tracking-tight text-[#2c2c2c] md:text-3xl">
          What KOB takes from you
        </h2>
        <ul className="grid gap-6 sm:grid-cols-2">
          {PILLARS.map((p) => (
            <li key={p.title} className="rounded-2xl border border-[#2c2c2c]/8 bg-white p-6">
              <h3 className="font-heading text-lg font-semibold text-[#094413]">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#2c2c2c]/75">{p.description}</p>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-center text-sm text-[#2c2c2c]/60">
          £99/mo founding · 7-day trial, no card ·{" "}
          <Link href="/#pricing" className="font-medium text-[#088924] underline-offset-2 hover:underline">
            See pricing
          </Link>
        </p>
      </SaasSection>
    </>
  );
}
