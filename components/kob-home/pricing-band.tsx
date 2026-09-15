import Link from "next/link";
import { Button } from "@/components/kob-ui/button";

export function PricingBand() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-5 py-28 sm:px-8">
      <h2 className="font-display text-headline max-w-xl font-medium">
        Simple pricing. One manager per location.
      </h2>
      <div className="mt-12 max-w-lg rounded-[1.75rem] bg-cream p-8 sm:p-10">
        <p className="font-display text-5xl font-medium tracking-tight">£99</p>
        <p className="mt-1 text-muted">per location / month · founding</p>
        <p className="mt-5 text-ink">
          Reviews, Google, the website, and the kitchen. Suggest, then approve,
          then autopilot. You start the trial yourself.
        </p>
        <ul className="mt-6 space-y-2 text-ink">
          <li>14-day trial — no demo call</li>
          <li>Nothing public goes live without you</li>
          <li>Talk on WhatsApp or email when those land</li>
        </ul>
        <Button size="lg" className="mt-8" asChild>
          <Link href="/signup">Try for free</Link>
        </Button>
      </div>
      <p className="mt-8 max-w-lg text-sm text-muted">
        Later, £149 when KOB is the assistant manager, and £299 when he starts
        taking guests and the phone.
      </p>
    </section>
  );
}
