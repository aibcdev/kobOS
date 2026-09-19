"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { KobMark } from "@/components/kob-brand/kob-mark";
import { AUTONOMY_STAGES } from "@/lib/kob/demo";
import { cn } from "@/lib/kob/utils";

export function Autonomy() {
  const [active, setActive] = useState<(typeof AUTONOMY_STAGES)[number]["id"]>(
    "suggest",
  );
  const stage = AUTONOMY_STAGES.find((item) => item.id === active) ?? AUTONOMY_STAGES[0];
  const [granted, setGranted] = useState(false);

  return (
    <section id="autonomy" className="mx-auto max-w-6xl px-5 py-14 sm:py-16 sm:px-8">
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-8">
        <div>
          <h2 className="font-display text-headline font-medium">
            Suggest → Ask → Autopilot → Never
          </h2>
          <ul className="mt-8">
            {AUTONOMY_STAGES.map((item) => {
              const on = active === item.id;
              return (
                <li key={item.id} className="border-b border-line">
                  <button
                    type="button"
                    onClick={() => {
                      setActive(item.id);
                      setGranted(false);
                    }}
                    className={cn(
                      "flex min-h-14 w-full items-center py-3 text-left text-lg transition-colors duration-150",
                      on ? "text-espresso" : "text-subtle hover:text-ink",
                    )}
                  >
                    {item.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-[1.75rem] bg-cream p-5 sm:p-8">
          <div className="mx-auto flex max-w-md flex-col gap-3">
            <article className="rounded-2xl bg-paper px-4 py-4 shadow-card">
              <p className="text-[0.95rem] leading-relaxed text-ink">{stage.owner}</p>
            </article>
            <span className="mx-auto h-6 w-px bg-line-strong" />
            <article className="rounded-2xl bg-paper px-4 py-4 shadow-card">
              <div className="flex items-start gap-3">
                <KobMark size="sm" />
                <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-ink">
                  {stage.kob}
                </p>
              </div>
            </article>
            {stage.action ? (
              <>
                <span className="mx-auto h-6 w-px bg-line-strong" />
                {granted ? (
                  <article className="rounded-2xl bg-paper px-4 py-4 shadow-card">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-7 items-center justify-center rounded-full bg-sage text-paper">
                        <Check className="size-3.5" strokeWidth={2.5} />
                      </span>
                      <p className="text-[0.95rem] text-ink">
                        {stage.id === "approve"
                          ? "Saved to KOB’s autonomy."
                          : "Draft only — waiting for confirmation."}
                      </p>
                    </div>
                  </article>
                ) : (
                  <button
                    type="button"
                    onClick={() => setGranted(true)}
                    className="rounded-2xl bg-paper px-4 py-4 text-left text-[0.95rem] font-medium shadow-card"
                  >
                    {stage.action}
                  </button>
                )}
              </>
            ) : (
              <>
                <span className="mx-auto h-6 w-px bg-line-strong" />
                <article className="rounded-2xl bg-paper px-4 py-4 shadow-card">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-7 items-center justify-center rounded-full bg-sage text-paper">
                      <Check className="size-3.5" strokeWidth={2.5} />
                    </span>
                    <p className="text-[0.95rem] text-ink">Handled overnight. Told you this morning.</p>
                  </div>
                </article>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="mt-10 overflow-hidden rounded-[1.75rem] border border-line">
        <p className="px-6 py-4 text-sm font-medium text-espresso sm:px-8">
          You choose what KOB can handle automatically.
        </p>
        <ul className="divide-y divide-line text-sm">
          {[
            ["5-star reviews", "AUTOPILOT"],
            ["Google hours", "ASK"],
            ["Supplier changes", "ASK"],
            ["Prep adjustments", "±10% AUTOPILOT"],
            ["Guest refunds", "NEVER"],
          ].map(([job, mode]) => (
            <li key={job} className="flex justify-between gap-4 px-6 py-3 sm:px-8">
              <span>{job}</span>
              <span className="text-muted">{mode}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
