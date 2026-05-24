"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { appBtnPrimary, appBtnSecondary, appCardSurface, appCodeInline } from "@/lib/app-ui-classes";

type Briefing = {
  warm_greeting?: string;
  brand_visual_pulse?: string;
  visual_storytelling_opportunities?: string[];
  website_conversion_opportunities?: string[];
  reputation_block?: string;
  top_actions_today?: { label: string; detail: string }[];
};

export function GrowthAgentBriefingPanel({
  restaurantId,
  autoRun = false,
}: {
  restaurantId: string;
  /** When true, loads briefing once on mount (OpenAI cost). Set `NEXT_PUBLIC_DASHBOARD_AUTO_BRIEFING=1`. */
  autoRun?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [rawJson, setRawJson] = useState<string | null>(null);
  const autoStarted = useRef(false);

  const run = useCallback(async () => {
    setError(null);
    setBriefing(null);
    setRawJson(null);
    setLoading(true);
    try {
      const res = await fetch("/api/growth-agent/daily-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; briefing?: Briefing; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Request failed");
        setLoading(false);
        return;
      }
      if (data.briefing) {
        setBriefing(data.briefing);
        setRawJson(JSON.stringify(data.briefing, null, 2));
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    if (!autoRun || autoStarted.current) return;
    autoStarted.current = true;
    void run();
  }, [autoRun, run]);

  return (
    <div className={appCardSurface}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="type-title-sm">Today&apos;s Growth Briefing</h2>
          <p className="type-body-sm mt-2 text-[var(--color-muted)]">
            Structured AI brief — needs <code className={appCodeInline}>OPENAI_API_KEY</code>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={loading} onClick={() => void run()} className={appBtnSecondary}>
            {loading ? "Refreshing…" : briefing ? "Refresh briefing" : "Generate briefing"}
          </button>
        </div>
      </div>
      {error ? <p className="type-body-sm mt-4 text-red-700">{error}</p> : null}

      {briefing ? (
        <div className="mt-8 space-y-8 border-t border-[var(--color-hairline)] pt-8">
          <section>
            <h3 className="type-caption font-semibold uppercase text-[var(--color-muted-medium)]">Greeting</h3>
            <p className="type-body-md mt-2 text-pretty text-[var(--color-ink)]">{briefing.warm_greeting}</p>
          </section>
          <section>
            <h3 className="type-caption font-semibold uppercase text-[var(--color-muted-medium)]">Brand &amp; visual pulse</h3>
            <p className="type-body-md mt-2 text-pretty text-[var(--color-muted)]">{briefing.brand_visual_pulse}</p>
          </section>
          <section>
            <h3 className="type-caption font-semibold uppercase text-[var(--color-muted-medium)]">Visual storytelling</h3>
            <ul className="type-body-sm mt-2 list-disc space-y-2 pl-5 text-[var(--color-muted)]">
              {(briefing.visual_storytelling_opportunities ?? []).map((x, i) => (
                <li key={`v-${i}`}>{x}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="type-caption font-semibold uppercase text-[var(--color-muted-medium)]">Website conversion</h3>
            <ul className="type-body-sm mt-2 list-disc space-y-2 pl-5 text-[var(--color-muted)]">
              {(briefing.website_conversion_opportunities ?? []).map((x, i) => (
                <li key={`w-${i}`}>{x}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="type-caption font-semibold uppercase text-[var(--color-muted-medium)]">Reputation</h3>
            <p className="type-body-md mt-2 text-pretty whitespace-pre-wrap text-[var(--color-muted)]">
              {briefing.reputation_block}
            </p>
          </section>
          <section>
            <h3 className="type-caption font-semibold uppercase text-[var(--color-muted-medium)]">Top actions today</h3>
            <ul className="mt-3 space-y-3">
              {(briefing.top_actions_today ?? []).map((a, i) => (
                <li
                  key={`${a.label}-${i}`}
                  className="rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-beige)] px-4 py-3"
                >
                  <p className="type-label-md text-[var(--color-ink)]">{a.label}</p>
                  <p className="type-body-sm mt-1 text-[var(--color-muted)]">{a.detail}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}

      {!briefing && !loading && !error ? (
        <p className="type-body-sm mt-6 text-[var(--color-muted)]">
          Run a briefing to see personalized sections, or enable auto-load with{" "}
          <code className={appCodeInline}>NEXT_PUBLIC_DASHBOARD_AUTO_BRIEFING=1</code>.
        </p>
      ) : null}

      {rawJson ? (
        <details className="mt-8">
          <summary className="type-caption cursor-pointer text-[var(--color-muted-medium)]">Raw JSON</summary>
          <pre className="type-body-sm mt-3 max-h-64 overflow-auto rounded-[var(--radius-md)] bg-[var(--color-ink)] p-4 text-[var(--color-text-inverse-muted)]">
            {rawJson}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
