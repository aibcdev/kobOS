"use client";

import { useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Globe,
  MapPin,
  Megaphone,
  Star,
  UtensilsCrossed,
  Check,
  Phone,
  Beef,
} from "lucide-react";
import { KobMark } from "@/components/kob-brand/kob-mark";
import { JOBS, type JobKey } from "@/lib/kob/demo";
import { cn } from "@/lib/kob/utils";

const ICONS: Record<JobKey, typeof Star> = {
  reviews: Star,
  google: MapPin,
  website: Globe,
  kitchen: Beef,
  reservations: CalendarDays,
  marketing: Megaphone,
  events: UtensilsCrossed,
  reporting: BarChart3,
};

export function Jobs() {
  const [active, setActive] = useState<JobKey>("reviews");
  const job = JOBS.find((j) => j.key === active) ?? JOBS[0];

  return (
    <section id="jobs" className="mx-auto max-w-6xl px-5 py-28 sm:px-8">
      <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <div>
          <h2 className="font-display text-headline font-medium">
            KOB does what restaurant managers do
          </h2>
          <ul className="mt-12">
            {JOBS.map((item) => {
              const ItemIcon = ICONS[item.key];
              const on = active === item.key;
              return (
                <li key={item.key} className="border-b border-line">
                  <button
                    type="button"
                    onClick={() => setActive(item.key)}
                    className={cn(
                      "flex min-h-14 w-full items-center gap-3 py-3 text-left text-lg transition-colors duration-150",
                      on ? "text-espresso" : "text-subtle hover:text-ink",
                    )}
                  >
                    <ItemIcon className="size-4" strokeWidth={1.6} />
                    <span className="flex-1">{item.label}</span>
                    {item.live ? null : (
                      <span className="text-xs text-subtle">Soon</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-[1.75rem] bg-cream p-5 sm:p-8">
          <div className="mx-auto flex max-w-md flex-col items-stretch gap-3">
            {job.flow.map((step, index) => (
              <div key={`${job.key}-${index}`} className="flex flex-col items-center">
                {index > 0 ? (
                  <span className="mb-3 h-6 w-px bg-line-strong" />
                ) : null}
                <article className="w-full rounded-2xl bg-paper px-4 py-4 shadow-card">
                  <div className="flex items-start gap-3">
                    {step.from === "kob" ? (
                      <KobMark size="sm" />
                    ) : step.from === "done" ? (
                      <span className="inline-flex size-7 items-center justify-center rounded-full bg-sage text-paper">
                        <Check className="size-3.5" strokeWidth={2.5} />
                      </span>
                    ) : step.from === "call" ? (
                      <span className="inline-flex size-7 items-center justify-center rounded-full bg-sage-soft text-sage">
                        <Phone className="size-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex size-7 items-center justify-center rounded-full bg-cream text-xs font-medium text-ink">
                        {step.who?.[0] ?? "G"}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.95rem] leading-relaxed text-ink">
                        {step.text}
                      </p>
                    </div>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
