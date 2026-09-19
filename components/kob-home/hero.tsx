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
        <div className="grid items-end gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-xl text-paper">
            <p className="text-xs font-medium tracking-[0.14em] text-paper/75 uppercase">
              The AI restaurant manager
            </p>
            <h1 className="font-display text-display mt-4 font-medium tracking-[-0.05em] text-paper">
              KOB runs the work
              <br />
              around your restaurant.
            </h1>
            <p className="mt-5 max-w-md text-lg text-paper/80">
              Google, reviews, hours, costs, and prep — you approve before anything
              public. Example morning brief below, not a named case study.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" variant="cream" asChild>
                <Link
                  href="/onboard"
                  onClick={() => {
                    void import("@/lib/kob/analytics").then((m) => m.trackKob("hero_try_clicked"));
                  }}
                >
                  Try KOB free
                </Link>
              </Button>
              <Button size="lg" variant="frost" asChild>
                <Link
                  href="/login"
                  onClick={() => {
                    void import("@/lib/kob/analytics").then((m) => m.trackKob("hero_talk_clicked"));
                  }}
                >
                  Talk to KOB
                </Link>
              </Button>
            </div>
          </div>

          <TalkOrb className="-translate-y-4 lg:-translate-y-6 ml-auto w-full max-w-56 self-start lg:mt-4" />
        </div>
      </div>
    </section>
  );
}
