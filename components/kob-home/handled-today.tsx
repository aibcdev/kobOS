"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CallChip, StatusMark, type CallChipState, useInViewOnce } from "@/components/kob-micro";
import { Button } from "@/components/kob-ui/button";

type Step = {
  id: string;
  running: string;
  done: string;
  end: CallChipState;
};

const STEPS: Step[] = [
  {
    id: "google",
    running: "Checking Google hours…",
    done: "Google hours verified",
    end: "done",
  },
  {
    id: "site",
    running: "Checking your website…",
    done: "Website matches",
    end: "done",
  },
  {
    id: "invoice",
    running: "Reading yesterday's invoices…",
    done: "Salmon increased 13.2%",
    end: "warning",
  },
  {
    id: "prep",
    running: "Preparing tomorrow…",
    done: "Prep note ready",
    end: "done",
  },
];

export function HandledToday() {
  const reduce = useReducedMotion();
  const [ref, inView] = useInViewOnce<HTMLElement>();
  const [index, setIndex] = useState(reduce ? STEPS.length : -1);
  const [chipState, setChipState] = useState<CallChipState>(reduce ? "done" : "idle");
  const [showNeeds, setShowNeeds] = useState(Boolean(reduce));

  useEffect(() => {
    if (!inView || reduce) {
      if (reduce) {
        setIndex(STEPS.length);
        setShowNeeds(true);
      }
      return;
    }

    let cancelled = false;
    let step = 0;

    async function run() {
      for (; step < STEPS.length; step++) {
        if (cancelled) return;
        setIndex(step);
        setChipState("running");
        await wait(reduce ? 0 : 700);
        if (cancelled) return;
        setChipState(STEPS[step]!.end);
        await wait(reduce ? 0 : 450);
      }
      if (!cancelled) setShowNeeds(true);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [inView, reduce]);

  const current = index >= 0 && index < STEPS.length ? STEPS[index] : null;
  const label =
    current == null
      ? "Ready"
      : chipState === "running"
        ? current.running
        : current.done;

  return (
    <section ref={ref} className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
      <p className="text-sm font-medium text-muted">Morning brief · example</p>
      <h2 className="font-display text-headline mt-2 max-w-xl font-medium">
        What KOB handled today
      </h2>
      <p className="mt-3 max-w-lg text-sm text-muted">
        Illustrative sequence — not a named restaurant result.
      </p>

      <div className="mt-8 max-w-lg space-y-4">
        <div className="flex items-center gap-3">
          <StatusMark state={showNeeds ? "verified" : "running"} />
          <p className="text-sm font-medium text-espresso">
            {showNeeds ? "Morning pass complete" : "KOB is working"}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {current ? (
            <motion.div
              key={`${current.id}-${chipState}`}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <CallChip label={label} state={chipState} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <ul className="space-y-2">
          {STEPS.map((s, i) => {
            const done = index > i || (index === i && chipState !== "running") || showNeeds;
            const active = index === i && !showNeeds;
            return (
              <li
                key={s.id}
                className="flex items-center gap-2.5 text-sm text-ink"
              >
                <StatusMark
                  state={
                    !done && !active
                      ? "idle"
                      : active && chipState === "running"
                        ? "running"
                        : s.end === "warning"
                          ? "warning"
                          : "verified"
                  }
                />
                <span className={done || active ? "" : "text-muted"}>
                  {s.end === "warning" && done ? s.done : s.done.replace("Salmon increased 13.2%", "Invoice lines checked")}
                </span>
              </li>
            );
          })}
        </ul>

        <AnimatePresence>
          {showNeeds ? (
            <motion.div
              initial={reduce ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="overflow-hidden rounded-[1.5rem] bg-cream p-5"
            >
              <p className="text-sm font-medium text-espresso">Needs you</p>
              <p className="mt-2 text-sm text-ink">
                Salmon is £1.14/kg more expensive than last month.
              </p>
              <Button size="sm" className="mt-4" asChild>
                <Link href="/onboard">Review</Link>
              </Button>
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
