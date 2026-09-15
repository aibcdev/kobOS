"use client";

import Link from "next/link";
import { TalkOrb } from "@/components/kob-home/talk-orb";
import { Button } from "@/components/kob-ui/button";

export function Hero() {
  return (
    <section className="relative min-h-dvh overflow-hidden bg-espresso">
      <img
        src="/photos/hero-interior.jpg"
        alt="Looking through glass into a quiet independent restaurant"
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0 bg-espresso/30" />

      <div className="relative mx-auto flex min-h-dvh max-w-7xl flex-col justify-end px-5 pb-16 pt-28 sm:px-8 lg:justify-center lg:pb-24 lg:pt-32">
        <div className="max-w-3xl text-paper">
          <div className="flex items-center gap-6 sm:gap-10">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-paper/80">Meet KOB</p>
              <h1 className="font-display text-display mt-4 font-medium tracking-[-0.05em] text-paper">
                KOB, the AI
                <br />
                restaurant manager
              </h1>
            </div>
            <TalkOrb className="hidden shrink-0 sm:block" />
          </div>
          <p className="mt-5 max-w-md text-lg text-paper/80">
            You talk on the floor. KOB takes the job — hours, reviews,
            Google, the website, and the kitchen. Nothing goes public until
            you say yes.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" variant="cream" asChild>
              <Link href="/signup">Try for free</Link>
            </Button>
            <Button size="lg" variant="frost" asChild>
              <a href="#how">See how it works</a>
            </Button>
          </div>
          <TalkOrb className="mt-10 sm:hidden" />
        </div>
      </div>
    </section>
  );
}
