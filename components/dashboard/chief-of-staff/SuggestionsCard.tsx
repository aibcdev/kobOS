"use client";

import { useState } from "react";
import { cosCard, cosSectionLabel } from "@/lib/dashboard/chief-of-staff-theme";

export function SuggestionsCard({
  suggestions,
  onDoIt,
}: {
  suggestions: string[];
  onDoIt: (suggestion: string) => Promise<void>;
}) {
  const [busySuggestion, setBusySuggestion] = useState<string | null>(null);

  async function handle(s: string) {
    setBusySuggestion(s);
    try {
      await onDoIt(s);
    } finally {
      setBusySuggestion(null);
    }
  }

  return (
    <section className={`${cosCard} p-5`}>
      <p className={cosSectionLabel}>Suggestions</p>
      {suggestions.length ? (
        <ul className="mt-3 space-y-2">
          {suggestions.map((s) => (
            <li
              key={s}
              className="flex items-center justify-between gap-2 rounded-xl border border-[#f0f0f0] bg-[#fafafa] px-3 py-2.5"
            >
              <span className="text-sm leading-snug text-[#444]">{s}</span>
              <button
                type="button"
                disabled={busySuggestion === s}
                onClick={() => void handle(s)}
                className="shrink-0 rounded-full bg-[#1a1a1a] px-3 py-1.5 text-xs font-medium text-white transition-transform active:scale-95 disabled:opacity-50"
              >
                {busySuggestion === s ? "Adding…" : "Do it"}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[#888]">Approve tasks to unlock suggestions.</p>
      )}
    </section>
  );
}
