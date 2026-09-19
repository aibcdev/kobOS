"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { KobMark } from "@/components/kob-brand/kob-mark";
import { Button } from "@/components/kob-ui/button";

function OwnerChip() {
  return (
    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-espresso text-[0.65rem] font-medium text-paper">
      You
    </span>
  );
}

export function Memory() {
  const [remembered, setRemembered] = useState(false);

  return (
    <section className="mx-auto max-w-6xl px-5 py-14 sm:py-16 sm:px-8">
      <div className="grid items-start gap-8 lg:grid-cols-[0.7fr_1.3fr]">
        <h2 className="font-display text-headline font-medium">
          KOB learns how you run the restaurant
        </h2>

        <div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.75rem] bg-cream p-5">
              <div className="space-y-3">
                <div className="rounded-2xl bg-paper p-4">
                  <div className="flex gap-3">
                    <KobMark size="sm" />
                    <p className="text-sm leading-relaxed text-ink">
                      Here is a draft reply to the wait complaint. Send it, and
                      offer a voucher?
                    </p>
                  </div>
                </div>
                <div className="flex justify-center">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-sage text-paper">
                    <Check className="size-3.5" strokeWidth={2.5} />
                  </span>
                </div>
                <div className="rounded-2xl bg-paper p-4">
                  <div className="flex gap-3">
                    <OwnerChip />
                    <p className="text-sm text-ink">Send it — no voucher.</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-paper p-4">
                  <div className="flex gap-3">
                    <KobMark size="sm" />
                    <p className="text-sm text-ink">
                      Sent. Should I avoid offering vouchers for complaints going
                      forward?
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-cream p-5">
              <div className="space-y-3">
                <div className="rounded-2xl bg-paper p-4">
                  <div className="flex gap-3">
                    <KobMark size="sm" />
                    <p className="text-sm leading-relaxed text-ink">
                      Thursday is quiet. I can send last month’s Thursday guests a
                      20% offer.
                    </p>
                  </div>
                </div>
                <div className="flex justify-center">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-amber text-paper">
                    <X className="size-3.5" strokeWidth={2.5} />
                  </span>
                </div>
                <div className="rounded-2xl bg-paper p-4">
                  <div className="flex gap-3">
                    <OwnerChip />
                    <p className="text-sm text-ink">
                      Never discount busy nights without asking me first. Keep Thursday as-is.
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl bg-paper p-4">
                  <div className="flex gap-3">
                    <KobMark size="sm" />
                    <p className="text-sm text-ink">
                      Got it — confirm before I save that as a house rule?
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-center">
            {remembered ? (
              <p className="text-sm text-muted">Committed to house rules</p>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setRemembered(true)}>
                Never change our coffee supplier without asking
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
