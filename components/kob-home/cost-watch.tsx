"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CallChip,
  SlideCommit,
  type CallChipState,
  useInViewOnce,
  WarmTooltip,
} from "@/components/kob-micro";

const STAGES: { id: string; label: string; next: CallChipState }[] = [
  { id: "read", label: "Reading Roma Foods invoice…", next: "done" },
  { id: "compare", label: "Comparing previous invoices…", next: "done" },
  { id: "alt", label: "Checking equivalent products…", next: "done" },
];

export function CostWatch() {
  const reduce = useReducedMotion();
  const [ref, inView] = useInViewOnce<HTMLElement>();
  const [stage, setStage] = useState(0);
  const [chip, setChip] = useState<CallChipState>("idle");
  const [reveal, setReveal] = useState(Boolean(reduce));
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setReveal(true);
      setStage(STAGES.length);
      return;
    }
    let cancelled = false;
    async function run() {
      for (let i = 0; i < STAGES.length; i++) {
        if (cancelled) return;
        setStage(i);
        setChip("running");
        await wait(650);
        if (cancelled) return;
        setChip("done");
        await wait(400);
      }
      if (!cancelled) setReveal(true);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [inView, reduce]);

  const current = STAGES[Math.min(stage, STAGES.length - 1)];

  return (
    <section ref={ref} className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
      <h2 className="font-display text-headline max-w-xl font-medium">
        KOB watches what you’re paying
      </h2>
      <p className="mt-5 max-w-xl text-lg text-ink">
        Cost Watch starts with supplier emails. Photo OCR is the fallback. Unit-cost flags
        appear when invoice lines exist — never invented savings.{" "}
        <WarmTooltip term="Projected saving">
          Example only until live invoices are connected for your restaurant.
        </WarmTooltip>
      </p>

      <div className="mt-8 max-w-lg space-y-4 rounded-[1.75rem] bg-cream p-7 sm:p-8">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">Illustration</p>

        {!reveal && current ? (
          <CallChip
            label={chip === "running" ? current.label : current.label.replace("…", " ✓")}
            state={chip === "idle" ? "running" : chip}
          />
        ) : null}

        <AnimatePresence>
          {reveal ? (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <p className="font-medium text-espresso">12oz takeaway cups</p>
              <p className="mt-4 text-ink">Current landed £0.077 each</p>
              <p className="text-ink">Comparable pack £0.068 each</p>
              <p className="mt-2 text-sm font-medium text-sage">
                Potential saving ~£36 / month
              </p>
              <p className="mt-3 text-sm text-muted">
                Same size, material, spec, delivery window — example only.
              </p>

              <div className="mt-6">
                <SlideCommit
                  label="Slide to switch next order"
                  successLabel="Queued for Talk — not sent to supplier"
                  failureLabel="Could not queue"
                  onCommit={async () => {
                    await wait(600);
                    setNote(
                      "Queued for your approval in Talk — not sent to supplier.",
                    );
                    return true;
                  }}
                />
              </div>
              {note ? <p className="mt-3 text-xs text-muted">{note}</p> : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}

function wait(ms: number) {
  return new Promise((r) => window.setTimeout(r, ms));
}
