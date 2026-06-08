"use client";

import type { TodayBriefSummary } from "@/lib/chief-of-staff/types";
import { cosCard, cosPill, cosSectionLabel } from "@/lib/dashboard/chief-of-staff-theme";

export function InsightsSidebar({
  summary,
  onSuggestionClick,
}: {
  summary: TodayBriefSummary;
  onSuggestionClick?: (s: string) => void;
}) {
  return (
    <aside className="flex flex-col gap-5">
      <section className={`${cosCard} p-5`}>
        <p className={cosSectionLabel}>Need to know</p>
        <ul className="mt-3 space-y-3">
          {summary.needToKnow.length ? (
            summary.needToKnow.map((line) => (
              <li key={line} className="text-sm leading-snug text-[#333]">
                {line}
              </li>
            ))
          ) : (
            <li className="text-sm text-[#888]">No critical alerts right now.</li>
          )}
        </ul>
      </section>

      <section className={`${cosCard} p-5`}>
        <p className={cosSectionLabel}>Suggestions</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {summary.suggestions.length ? (
            summary.suggestions.map((s) =>
              onSuggestionClick ? (
                <button key={s} type="button" onClick={() => onSuggestionClick(s)} className={`${cosPill} cursor-pointer hover:bg-[#eee]`}>
                  {s}
                </button>
              ) : (
                <span key={s} className={cosPill}>
                  {s}
                </span>
              ),
            )
          ) : (
            <span className="text-sm text-[#888]">Approve tasks on the left to get started.</span>
          )}
        </div>
      </section>
    </aside>
  );
}
