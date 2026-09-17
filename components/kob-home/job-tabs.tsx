"use client";

import { useState } from "react";
import { cn } from "@/lib/kob/utils";

const JOBS = [
  {
    id: "phone",
    label: "Phone",
    soon: true,
    steps: [
      "Incoming call",
      "Staff get ~15 seconds",
      "If they miss it, KOB answers",
      "“Table for four at 7?”",
      "KOB checks the book",
      "Guest confirms — Coming soon",
    ],
  },
  {
    id: "guests",
    label: "Guests",
    soon: false,
    steps: ["Public reviews watched", "Thank-you drafted", "You approve", "Complaint stays with you"],
  },
  {
    id: "reputation",
    label: "Reputation",
    soon: false,
    steps: ["Rating and recency", "Tone from the house", "5-stars can go on autopilot", "You set the rule"],
  },
  {
    id: "presence",
    label: "Presence",
    soon: false,
    steps: ["Google vs website hours", "Canonical source from your rule", "Update", "Read back before Done"],
  },
  {
    id: "costs",
    label: "Costs",
    soon: false,
    steps: ["Invoice arrives", "Lines normalised", "Price vs last delivery", "You keep or switch"],
  },
  {
    id: "prep",
    label: "Prep",
    soon: false,
    steps: ["Covers + weather", "Prep suggestion", "You approve the change", "Measured waste is Coming soon"],
  },
  {
    id: "waste",
    label: "Waste",
    soon: true,
    steps: ["Over-prep and over-order first", "Waste Eye measures later", "Never mix estimate with measured"],
  },
] as const;

export function JobTabs() {
  const [id, setId] = useState<(typeof JOBS)[number]["id"]>("phone");
  const job = JOBS.find((j) => j.id === id) ?? JOBS[0];

  return (
    <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
      <h2 className="font-display text-headline max-w-2xl font-medium">
        KOB does what assistant managers do
      </h2>
      <div className="mt-8 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <ul>
          {JOBS.map((item) => (
            <li key={item.id} className="border-b border-line">
              <button
                type="button"
                onClick={() => setId(item.id)}
                className={cn(
                  "flex min-h-14 w-full items-center justify-between py-3 text-left text-lg",
                  id === item.id ? "text-espresso" : "text-subtle hover:text-ink",
                )}
              >
                {item.label}
                {item.soon ? <span className="text-xs text-muted">Coming soon</span> : null}
              </button>
            </li>
          ))}
        </ul>
        <ol className="space-y-3 rounded-[1.75rem] bg-cream p-6 sm:p-8">
          {job.steps.map((step, i) => (
            <li key={step} className="flex gap-3 text-ink">
              <span className="text-sm text-muted">{String(i + 1).padStart(2, "0")}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
