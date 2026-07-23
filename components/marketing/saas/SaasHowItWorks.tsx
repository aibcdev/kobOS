import { marketingCopy } from "@/lib/marketing/copy";

import { SaasIcon } from "./SaasIcon";

const STEPS = [
  {
    n: "1",
    title: "Scan",
    body: "Run a free scan of your website and Google presence. In about a minute you’ll see the gaps guests notice before they book.",
    image:
      "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Phone showing restaurant online presence",
  },
  {
    n: "2",
    title: "Approve",
    body: "Each day you get a clear list—review replies, hours, holiday posts. Approve in one tap, or edit first. Nothing goes live without you.",
    image:
      "https://images.unsplash.com/photo-1556745753-b2904692e57f?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Approving tasks on a tablet",
  },
  {
    n: "3",
    title: "Request help",
    body: "Need a stronger site, SEO, or brand work? Spend credits on requests—KOB fulfills the deliverable so you stay on the floor.",
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Welcoming restaurant exterior",
  },
] as const;

export function SaasHowItWorks() {
  return (
    <section id="how-it-works" className="bg-[#f9f6f1] px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[83rem]">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono-brand text-xs font-semibold uppercase tracking-wider text-[var(--color-forest-mid)]">
            {marketingCopy.howItWorksEyebrow}
          </p>
          <h2 className="font-heading mt-3 text-3xl font-semibold tracking-tight text-[#1a1a1a] md:text-5xl">
            {marketingCopy.howItWorksHeadline}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-[#2c2c2c]/70 md:text-base">
            {marketingCopy.howItWorksSubline}
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {STEPS.map((step) => (
            <article key={step.n} className="flex flex-col">
              <div className="relative overflow-hidden rounded-[1.5rem] bg-[#ebe6df]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={step.image} alt={step.imageAlt} className="aspect-[4/3] w-full object-cover" />
                <span className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-forest)] font-heading text-sm font-semibold text-white">
                  {step.n}
                </span>
              </div>
              <h3 className="font-heading mt-5 text-xl font-semibold text-[#1a1a1a]">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#2c2c2c]/70">{step.body}</p>
            </article>
          ))}
        </div>

        <p className="mt-10 flex items-center justify-center gap-2 text-sm text-[#2c2c2c]/55">
          <SaasIcon icon="solar:shield-check-bold" className="text-[var(--color-forest-mid)]" />
          {marketingCopy.howItWorksProof}
        </p>
      </div>
    </section>
  );
}
