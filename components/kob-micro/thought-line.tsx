"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/kob/utils";
import { StatusMark, type StatusMarkState } from "./status-mark";

export type ThoughtStep = {
  id: string;
  label: string;
  state: StatusMarkState;
};

/** Factual tool progress only — never model chain-of-thought. */
export function ThoughtLine({
  title = "KOB is checking…",
  steps,
  settled,
  settledSummary,
  className,
}: {
  title?: string;
  steps: ThoughtStep[];
  settled?: boolean;
  settledSummary?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(true);

  if (settled && settledSummary) {
    return (
      <motion.div
        className={cn("rounded-2xl bg-cream px-4 py-3 text-sm text-ink", className)}
        initial={reduce ? false : { opacity: 0.6 }}
        animate={{ opacity: 1 }}
      >
        {settledSummary}
      </motion.div>
    );
  }

  return (
    <div className={cn("rounded-2xl border border-line bg-paper", className)}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-espresso"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2">
          <StatusMark state={steps.every((s) => s.state === "verified") ? "verified" : "running"} />
          {title}
        </span>
        <ChevronDown className={cn("size-4 text-muted transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.ul
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.28 }}
            className="overflow-hidden border-t border-line px-4 pb-3"
          >
            {steps.map((step) => (
              <li key={step.id} className="flex items-center gap-2.5 py-2 text-sm text-ink">
                <StatusMark state={step.state} />
                <span>{step.label}</span>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
