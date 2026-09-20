"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useInViewOnce, WarmTooltip } from "@/components/kob-micro";

type Row = {
  label: string;
  from: string;
  to: string;
  fromN: number;
  toN: number;
  unit: string;
};

const ROWS: Row[] = [
  { label: "Focaccia", from: "4 trays", to: "3 trays", fromN: 4, toN: 3, unit: " trays" },
  { label: "Pastries", from: "40", to: "33", fromN: 40, toN: 33, unit: "" },
  { label: "Chicken", from: "5.8kg", to: "6.2kg", fromN: 5.8, toN: 6.2, unit: "kg" },
  { label: "Salad prep", from: "4.5kg", to: "4.1kg", fromN: 4.5, toN: 4.1, unit: "kg" },
];

function MorphNumber({
  from,
  to,
  unit,
  active,
  decimals = 0,
}: {
  from: number;
  to: number;
  unit: string;
  active: boolean;
  decimals?: number;
}) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(from);

  useEffect(() => {
    if (!active) {
      setN(from);
      return;
    }
    if (reduce) {
      setN(to);
      return;
    }
    const start = performance.now();
    const dur = 700;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, from, to, reduce]);

  const text =
    unit === " trays"
      ? `${Math.round(n)} trays`
      : unit === "kg"
        ? `${n.toFixed(1)}kg`
        : `${Math.round(n)}`;

  return <span className="tabular-nums">{text}</span>;
}

export function KitchenPrep() {
  const [ref, inView] = useInViewOnce<HTMLElement>();
  const [why, setWhy] = useState(false);

  return (
    <section ref={ref} className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
      <p className="text-sm font-medium text-muted">Prep · BETA</p>
      <h2 className="font-display text-headline mt-3 max-w-2xl font-medium">
        Prep what the kitchen will actually sell
      </h2>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[1.75rem] bg-cream p-7 sm:p-8">
          <p className="text-sm font-medium text-muted">Tomorrow · example quantities</p>
          <p className="mt-4 text-3xl font-medium">Expected covers 84</p>
          <ul className="mt-6 space-y-3 text-ink">
            {ROWS.map((row) => (
              <li key={row.label} className="flex items-baseline justify-between gap-4 text-sm sm:text-base">
                <span>{row.label}</span>
                <span className="text-muted">
                  <span className="line-through opacity-50">{row.from}</span>
                  {" → "}
                  <MorphNumber
                    from={row.fromN}
                    to={row.toN}
                    unit={row.unit}
                    active={inView}
                    decimals={row.unit === "kg" ? 1 : 0}
                  />
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-5 text-sm font-medium text-espresso underline-offset-2 hover:underline"
            onClick={() => setWhy((v) => !v)}
            aria-expanded={why}
          >
            Why?
          </button>
          <motion.div
            initial={false}
            animate={{ height: why ? "auto" : 0, opacity: why ? 1 : 0 }}
            className="overflow-hidden"
          >
            <p className="mt-2 text-sm text-muted">
              Rain expected from 1pm · lunch bookings softer than normal · similar Fridays
              sold 17% fewer pastries.{" "}
              <span className="text-subtle">Illustrative inputs — not live POS.</span>
            </p>
          </motion.div>
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-lg text-ink">
            Historical sales, bookings, weather, and house patterns. That is predictive
            waste prevention — not a{" "}
            <WarmTooltip term="Measured waste">
              Measured waste needs Waste Eye hardware. Estimates stay labelled predictive.
            </WarmTooltip>
            .
          </p>
          <p className="mt-4 text-sm text-muted">
            Waste Eye (camera + scale) is Coming next. We will not mix estimates into
            measured waste.
          </p>
        </div>
      </div>
    </section>
  );
}
