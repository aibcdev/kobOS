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
        Point KOB at the restaurant. KOB looks at Google, reviews and hours —
        then takes the job. You stay on the floor.
      </p>
      <div className="mt-10 max-w-lg rounded-[1.75rem] bg-cream p-6 sm:p-8">
        <p className="text-sm font-medium">Company name + your role. That&apos;s it.</p>
        <p className="mt-2 text-sm text-muted">
          KOB pulls Google, peers, and day focus from your seat.
        </p>
        <Button size="lg" className="mt-4 w-full" asChild>
          <Link href="/onboard">Hire KOB</Link>
        </Button>
      </div>
    </section>
  );
}
