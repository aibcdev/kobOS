"use client";

import { appCardSurface } from "@/lib/app-ui-classes";
import type { ThemeDriver } from "@/lib/insights/customer-voice";

export function SentimentDriversCard({
  drivers,
  onFilter,
  activeTheme,
}: {
  drivers: ThemeDriver[];
  onFilter?: (theme: string | null) => void;
  activeTheme?: string | null;
}) {
  const maxVal = Math.max(1, ...drivers.flatMap((d) => [d.positive, d.negative]));

  return (
    <div className={appCardSurface}>
      <h2 className="type-title-sm">Sentiment drivers</h2>
      <p className="type-caption mt-1 text-[var(--color-muted)]">Click a row to filter · Sorted by net score</p>
      <div className="mt-6 space-y-3">
        {drivers.map((d) => (
          <button
            key={d.theme}
            type="button"
            onClick={() => onFilter?.(activeTheme === d.theme ? null : d.theme)}
            className={`w-full rounded-[var(--radius-default)] p-2 text-left transition-colors ${
              activeTheme === d.theme ? "bg-[var(--color-surface-warm)]" : "hover:bg-[var(--color-surface-warm)]"
            }`}
          >
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-[var(--color-ink)]">
                {d.label}
                {d.alert ? <span className="ml-1 text-red-500">!</span> : null}
              </span>
              <span className="text-[var(--color-muted)]">{d.net > 0 ? "+" : ""}{d.net}</span>
            </div>
            <div className="mt-2 flex h-3 gap-1">
              <div
                className="rounded-l bg-green-400"
                style={{ width: `${(d.positive / maxVal) * 50}%`, minWidth: d.positive ? 4 : 0 }}
              />
              <div className="flex-1" />
              <div
                className="rounded-r bg-red-400"
                style={{ width: `${(d.negative / maxVal) * 50}%`, minWidth: d.negative ? 4 : 0 }}
              />
            </div>
          </button>
        ))}
      </div>
      <p className="type-caption mt-4 text-[var(--color-muted)]">Score = positive − negative mentions</p>
    </div>
  );
}
