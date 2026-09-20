"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useInViewOnce, WarmTooltip } from "@/components/kob-micro";

const EVENTS = [
  { name: "Focaccia", kg: "1.42kg" },
  { name: "Avocado", kg: "0.48kg" },
  { name: "Chicken trim", kg: "0.31kg" },
];

/** Restrained liquid-level meter — Coming next demo only. */
export function WasteBlock() {
  const reduce = useReducedMotion();
  const [ref, inView] = useInViewOnce<HTMLElement>();
  const level = 0.42; // 3.8kg illustrative fill

  return (
    <section id="waste" ref={ref} className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
      <p className="text-sm font-medium text-muted">Waste · two different jobs</p>
      <h2 className="font-display text-headline mt-3 max-w-2xl font-medium">
        Predictive prep is not measured waste
      </h2>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[1.75rem] bg-cream p-7 sm:p-8">
          <p className="text-sm font-medium text-sage">Prep · BETA</p>
          <p className="mt-3 text-lg text-ink">
            Actionable quantities from weather and bookings when connected — so the
            kitchen preps what it will sell.
          </p>
        </div>
        <div className="rounded-[1.75rem] border border-line bg-paper p-7 sm:p-8">
          <p className="text-sm font-medium text-muted">
            Waste Eye · Coming next ·{" "}
            <WarmTooltip term="Measured waste">
              Camera + scale. Example figures only — not a live customer reading.
            </WarmTooltip>
          </p>
          <p className="mt-4 text-xs font-medium uppercase tracking-wider text-muted">
            Today&apos;s measured waste · example
          </p>
          <p className="mt-2 text-3xl font-medium tabular-nums">3.8 kg</p>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-cream">
            <motion.div
              className="h-full rounded-full bg-espresso/80"
              initial={false}
              animate={{ width: inView || reduce ? `${level * 100}%` : "0%" }}
              transition={{ duration: reduce ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <ul className="mt-5 space-y-1.5 text-sm text-ink">
            {EVENTS.map((e) => (
              <li key={e.name} className="flex justify-between gap-4">
                <span>{e.name}</span>
                <span className="tabular-nums text-muted">{e.kg}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm font-medium text-espresso">£14.82 measured waste</p>
          <p className="mt-2 text-xs text-subtle">Example only. Hardware not live on this site.</p>
        </div>
      </div>
    </section>
  );
}
