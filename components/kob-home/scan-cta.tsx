"use client";

import Link from "next/link";
import { Button } from "@/components/kob-ui/button";

export function ScanCta() {
  return (
    <section id="hire" className="mx-auto max-w-6xl px-5 py-14 sm:py-16 sm:px-8">
      <h2 className="font-display text-headline max-w-2xl font-medium">
        Hire the manager. Keep the restaurant.
      </h2>
      <p className="mt-5 max-w-xl text-lg text-ink">
        Find your restaurant. See public findings in under two minutes. Create an account.
        Land in Talk with the work ready — £99 founding, 7-day trial, no card.
      </p>
      <div className="mt-10 max-w-lg rounded-[1.75rem] bg-cream p-6 sm:p-8">
        <p className="text-sm font-medium">Try KOB free</p>
        <p className="mt-2 text-sm text-muted">
          Value first. Optional preferences. Account before the trial sticks.
        </p>
        <Button size="lg" className="mt-4 w-full" asChild>
          <Link href="/onboard">Try KOB free</Link>
        </Button>
      </div>
    </section>
  );
}
