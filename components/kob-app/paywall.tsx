"use client";

import { GreenOrb } from "@/components/kob-home/green-orb";
import { Button } from "@/components/kob-ui/button";
import { useKobStore } from "@/lib/kob/store";

export function Paywall() {
  const trialEndsAt = useKobStore((s) => s.trialEndsAt);
  const startNoCardTrial = useKobStore((s) => s.startNoCardTrial);
  const restaurant = useKobStore((s) => s.restaurant);

  const live = trialEndsAt && new Date(trialEndsAt).getTime() > Date.now();
  if (live) return null;

  return (
    <div className="absolute inset-0 z-[60] flex items-end justify-center bg-espresso/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-[1.75rem] bg-paper p-6 shadow-soft sm:p-8">
        <GreenOrb size="md" />
        <p className="mt-4 text-sm font-medium text-sage">7 days free · no card</p>
        <h2 className="font-display mt-2 text-3xl font-medium tracking-tight text-espresso">
          Hire KOB for {restaurant?.name ?? "your restaurant"}
        </h2>
        <p className="mt-3 text-ink">
          Start a 7-day trial with no card. We learn what you need, then we
          learn with you. After that it is £99 a month per location.
        </p>
        <ul className="mt-5 space-y-2 text-sm text-ink">
          <li>Onboard in seconds</li>
          <li>Google, reviews, hours — you approve</li>
          <li>No card to start. Cancel before day 7 and you pay nothing</li>
        </ul>
        <Button
          size="lg"
          className="mt-6 w-full"
          onClick={() => {
            startNoCardTrial();
            void fetch("/api/kob/trial", { method: "POST" });
          }}
        >
          Start 7-day trial — no card
        </Button>
        <p className="mt-3 text-center text-xs text-muted">
          £99 / location / month after the trial. Founding price.
        </p>
      </div>
    </div>
  );
}
