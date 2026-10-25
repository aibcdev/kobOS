import type { Metadata } from "next";
import Link from "next/link";
import { SaasPageHero } from "@/components/marketing/saas/SaasPageHero";
import { SaasSection } from "@/components/marketing/saas/SaasSection";

export const metadata: Metadata = {
  title: "Solutions | KOB",
  description:
    "Help for full-service restaurants, cafés and small groups: more guests, better reviews and less admin, whatever kind of place you run.",
};

const SOLUTIONS = [
  {
    id: "full-service",
    title: "Full-service",
    description:
      "Hours, reviews and the website, checked before service. You tap approve. The booking system stays yours.",
    href: "/onboard",
  },
  {
    id: "cafe",
    title: "Café",
    description:
      "A short morning list: unanswered reviews, wrong hours, a menu link that is dead. A few taps, then you are on the floor.",
    href: "/onboard",
  },
  {
    id: "sites",
    title: "2–5 sites",
    description:
      "One manager per location. Same founding price. House rules stay with the site that uses them.",
    href: "/pricing",
  },
] as const;

export default function SolutionsHubPage() {
  return (
    <>
      <SaasPageHero
        eyebrow="Solutions"
        title="The manager, for how you run the room."
        description="Full-service, café or a few sites: KOB's free check-up shows what's keeping guests away and what to fix first."
      />

      <SaasSection className="bg-bone">
        <div className="grid gap-6 md:grid-cols-3">
          {SOLUTIONS.map((item) => (
            <article key={item.id} id={item.id} className="rounded-[1.75rem] border border-line bg-paper p-6">
              <h2 className="font-display text-title font-medium text-espresso">{item.title}</h2>
              <p className="mt-4 text-ink">{item.description}</p>
              <Link href={item.href} className="mt-6 inline-block text-sm font-medium underline underline-offset-4">
                Find my restaurant
              </Link>
            </article>
          ))}
        </div>
      </SaasSection>
    </>
  );
}
