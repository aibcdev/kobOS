import Link from "next/link";
import { Button } from "@/components/kob-ui/button";

export function PricingBand() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-5 py-14 sm:py-16 sm:px-8">
      <h2 className="font-display text-headline max-w-xl font-medium">
        Simple pricing. One manager per location.
      </h2>
      <div className="mt-8 max-w-lg rounded-[1.75rem] bg-cream p-8 sm:p-10">
        <p className="font-display text-5xl font-medium tracking-tight">£99</p>
        <p className="mt-1 text-muted">per location / month · founding</p>
        <p className="mt-5 text-ink">
          Founding restaurants keep this rate while they stay subscribed. Suggest, then
          approve, then autopilot — you choose what KOB can handle automatically.
        </p>
        <ul className="mt-6 space-y-2 text-ink">
          <li>3-day trial — no card</li>
          <li>Google, reviews, website, invoices, weather prep</li>
          <li>KOB Phone: Coming to founding restaurants</li>
        </ul>
        <Button size="lg" className="mt-8" asChild>
          <Link href="/onboard">Try KOB</Link>
        </Button>
      </div>
    </section>
  );
}
