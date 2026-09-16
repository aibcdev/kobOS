"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { LangosteriaWordmark } from "@/components/kob-brand/langosteria-mark";
import { Button } from "@/components/kob-ui/button";
import {
  DEMO_RESTAURANTS,
  PROOF_CASE,
  CORE_BENEFITS,
  KOB_JOBS,
} from "@/lib/kob/demo";
import { useKobStore } from "@/lib/kob/store";

export function BeforeAfter() {
  const router = useRouter();
  const hydrateRestaurant = useKobStore((s) => s.hydrateRestaurant);
  const restaurant =
    DEMO_RESTAURANTS.find((item) => item.id === PROOF_CASE.restaurantId) ??
    DEMO_RESTAURANTS[0];

  function openInKob() {
    hydrateRestaurant(restaurant);
    router.push("/meet");
  }

  return (
    <section id="proof" className="mx-auto max-w-6xl px-5 py-14 sm:py-16 sm:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <LangosteriaWordmark size="proof" withExample />
      </div>

      <h2 className="font-display text-headline mt-6 max-w-2xl font-medium">
        How KOB works on a multi-site room
      </h2>
      <p className="mt-5 max-w-2xl text-lg text-ink">
        {PROOF_CASE.name}, {PROOF_CASE.area}. An example of the jobs KOB
        prepares for your yes — not a customer claim. {PROOF_CASE.note}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {KOB_JOBS.map((item) => (
          <article
            key={item.title}
            className="rounded-[1.75rem] border border-line bg-cream p-5 sm:p-6"
            style={{ borderTop: "3px solid #e23c1a" }}
          >
            <p className="font-medium text-espresso">{item.title}</p>
            <p className="mt-2 text-sm text-ink">{item.body}</p>
          </article>
        ))}
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CORE_BENEFITS.map((item) => (
          <article
            key={item.title}
            className="rounded-[1.75rem] border border-[#e23c1a]/20 bg-cream p-5 sm:p-6"
          >
            <p className="font-medium text-espresso">{item.title}</p>
            <p className="mt-2 text-sm text-ink">{item.body}</p>
          </article>
        ))}
      </div>

      <p className="mt-8 text-sm text-muted">One job example · hours drift</p>
      <div className="mt-4 overflow-hidden rounded-[1.75rem] bg-cream">
        <div className="grid gap-px bg-line sm:grid-cols-4">
          <div className="bg-cream px-5 py-4 sm:px-6">
            <p className="text-sm text-muted">Source</p>
          </div>
          <div className="hidden bg-cream px-5 py-4 sm:block">
            <p className="text-sm text-muted">Sunday</p>
          </div>
          <div className="hidden bg-cream px-5 py-4 sm:block">
            <p className="text-sm text-muted">Monday</p>
          </div>
          <div className="hidden bg-cream px-5 py-4 sm:block">
            <p className="text-sm text-muted">Friday close</p>
          </div>
        </div>
        <ul>
          {PROOF_CASE.sources.map((source) => (
            <li
              key={source.name}
              className="border-t border-line px-5 py-5 sm:grid sm:grid-cols-4 sm:items-baseline sm:gap-4 sm:px-6"
            >
              <div>
                <p className="font-medium text-espresso">{source.name}</p>
                <p className="mt-1 text-sm text-subtle">{source.when}</p>
              </div>
              <p className="mt-3 text-ink sm:mt-0">
                <span className="text-subtle sm:hidden">Sunday · </span>
                {source.sunday}
              </p>
              <p className="mt-1 text-ink sm:mt-0">
                <span className="text-subtle sm:hidden">Monday · </span>
                {source.monday}
              </p>
              <p className="mt-1 text-ink sm:mt-0">
                <span className="text-subtle sm:hidden">Friday close · </span>
                {source.friday}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="rounded-[1.75rem] bg-cream p-6 sm:p-8">
          <p className="text-sm text-muted">Before · without KOB</p>
          <ul className="mt-6 space-y-6">
            {PROOF_CASE.before.map((item) => (
              <li key={item.title}>
                <p className="font-medium text-espresso">{item.title}</p>
                <p className="mt-1 text-ink">{item.body}</p>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-[1.75rem] bg-cream p-6 sm:p-8">
          <p className="text-sm text-muted">After · what KOB puts on the desk</p>
          <ul className="mt-6 space-y-6">
            {PROOF_CASE.after.map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-sage text-paper">
                  <Check className="size-3.5" strokeWidth={2.5} />
                </span>
                <div>
                  <p className="font-medium text-espresso">{item.title}</p>
                  <p className="mt-1 text-ink">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <p className="mt-8 max-w-2xl text-sm text-muted">
        Suggest, then approve. Nothing publishes without you. The restaurant stays
        yours.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={openInKob}>
          Open this in KOB
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/scan">Run yours</Link>
        </Button>
      </div>

      <p className="mt-10 text-[0.65rem] leading-relaxed text-subtle">
        {PROOF_CASE.disclaimer}
      </p>
    </section>
  );
}
