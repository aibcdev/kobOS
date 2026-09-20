"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { KobMark } from "@/components/kob-brand/kob-mark";
import { RubberSegment, StatusMark, SquishSwitch, WarmTooltip } from "@/components/kob-micro";

const SEGMENTS = [
  { id: "suggest" as const, label: "Suggest" },
  { id: "ask" as const, label: "Ask" },
  { id: "autopilot" as const, label: "Autopilot" },
];

const PANELS = {
  suggest: {
    title: "KOB noticed",
    body: "Google says you close at 4pm.\nYour website says 5pm.",
  },
  ask: {
    title: "KOB asks",
    body: "Set Google to 5pm?\nNothing goes live until you say so.",
  },
  autopilot: {
    title: "KOB handled it",
    body: "Google updated to 5pm.",
    verified: true,
  },
} as const;

export function Autonomy() {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<"suggest" | "ask" | "autopilot">("suggest");
  const panel = PANELS[mode];
  const [rows, setRows] = useState({
    reviews: true,
    hours: false,
    supplier: false,
    prep: true,
  });

  return (
    <section id="autonomy" className="mx-auto max-w-6xl px-5 py-14 sm:py-16 sm:px-8">
      <h2 className="font-display text-headline max-w-xl font-medium">
        Suggest → Ask → Autopilot
      </h2>
      <p className="mt-3 max-w-lg text-sm text-muted">
        Example only — hours are not written live from this page.{" "}
        <WarmTooltip term="Autopilot">
          KOB may run jobs inside rules you set. Public posts still verify before Done.
        </WarmTooltip>
      </p>

      <div className="mt-8 max-w-xl">
        <RubberSegment options={SEGMENTS} value={mode} onChange={setMode} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.75rem] bg-cream p-5 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28 }}
              className="mx-auto flex max-w-md flex-col gap-3"
            >
              <article className="rounded-2xl bg-paper px-4 py-4 shadow-card">
                <p className="text-xs font-medium text-muted">{panel.title}</p>
                <div className="mt-2 flex items-start gap-3">
                  <KobMark size="sm" />
                  <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-ink">
                    {panel.body}
                  </p>
                </div>
              </article>
              {"verified" in panel && panel.verified ? (
                <article className="flex items-center gap-3 rounded-2xl bg-paper px-4 py-4 shadow-card">
                  <StatusMark state="verified" showLabel />
                  <p className="text-sm text-ink">Example read-back — Verified ✓</p>
                </article>
              ) : null}
              {mode === "ask" ? (
                <button
                  type="button"
                  className="rounded-2xl bg-espresso px-4 py-3 text-left text-sm font-medium text-paper"
                >
                  Approve — Set Google to 5pm
                </button>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="overflow-hidden rounded-[1.75rem] border border-line">
          <p className="px-6 py-4 text-sm font-medium text-espresso">
            You choose what KOB can handle automatically.
          </p>
          <ul className="divide-y divide-line text-sm">
            <li className="flex items-center justify-between gap-4 px-6 py-3">
              <span>5-star reviews</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">{rows.reviews ? "AUTOPILOT" : "ASK"}</span>
                <SquishSwitch
                  checked={rows.reviews}
                  onChange={(v) => setRows((r) => ({ ...r, reviews: v }))}
                  label="5-star reviews autopilot"
                />
              </div>
            </li>
            <li className="flex items-center justify-between gap-4 px-6 py-3">
              <span>Google hours</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">{rows.hours ? "AUTOPILOT" : "ASK"}</span>
                <SquishSwitch
                  checked={rows.hours}
                  onChange={(v) => setRows((r) => ({ ...r, hours: v }))}
                  label="Google hours autopilot"
                />
              </div>
            </li>
            <li className="flex items-center justify-between gap-4 px-6 py-3">
              <span>Supplier changes</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">{rows.supplier ? "AUTOPILOT" : "ASK"}</span>
                <SquishSwitch
                  checked={rows.supplier}
                  onChange={(v) => setRows((r) => ({ ...r, supplier: v }))}
                  label="Supplier changes autopilot"
                />
              </div>
            </li>
            <li className="flex items-center justify-between gap-4 px-6 py-3">
              <span>Prep ±10%</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">{rows.prep ? "AUTOPILOT" : "ASK"}</span>
                <SquishSwitch
                  checked={rows.prep}
                  onChange={(v) => setRows((r) => ({ ...r, prep: v }))}
                  label="Prep adjustments autopilot"
                />
              </div>
            </li>
            <li className="flex justify-between gap-4 px-6 py-3">
              <span>Guest refunds</span>
              <span className="text-muted">NEVER</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
