"use client";

import { useState } from "react";
import type { WebsiteRedesignJson } from "@/lib/growth-agent/website-redesign-schema";
import { appBtnPrimary, appBtnSecondary, appCardSurface } from "@/lib/app-ui-classes";

function sectionKey(sec: WebsiteRedesignJson["sections"][number]) {
  return `${sec.section}::${sec.copy_headline}`;
}

export function WebsiteRedesignPanel({ restaurantId }: { restaurantId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WebsiteRedesignJson | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function run() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/growth-agent/website-redesign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId }),
      });
      const json = (await res.json()) as { ok?: boolean; sections?: WebsiteRedesignJson["sections"]; error?: string; minimumPlan?: string };
      if (res.status === 402) {
        setError(json.error === "upgrade_required" ? "Upgrade to Starter to run the website strategist." : (json.error ?? "Upgrade required"));
        setData(null);
        setLoading(false);
        return;
      }
      if (!res.ok || !json.sections) {
        setError(json.error ?? "Request failed");
        setData(null);
        setLoading(false);
        return;
      }
      setData({ sections: json.sections });
    } catch {
      setError("Network error");
      setData(null);
    }
    setLoading(false);
  }

  async function copyCta(sec: WebsiteRedesignJson["sections"][number]) {
    const key = sectionKey(sec);
    setError(null);
    try {
      await navigator.clipboard.writeText(sec.copy_cta);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
    } catch {
      setError("Could not copy — select the CTA text manually.");
    }
  }

  return (
    <div className="space-y-8">
      <div className={appCardSurface}>
        <h2 className="type-title-sm">AI website strategist</h2>
        <p className="type-body-sm mt-2 text-[var(--color-muted)]">
          Uses your workspace URL plus digest-style signals (keywords, traffic hints, optional city audit). Add a
          website URL on the restaurant if you have not already.
        </p>
        <button type="button" disabled={loading} onClick={() => void run()} className={`${appBtnPrimary} mt-4`}>
          {loading ? "Generating plan…" : "Generate redesign plan"}
        </button>
        {error ? <p className="type-body-sm mt-4 text-red-700">{error}</p> : null}
      </div>

      {data?.sections?.length ? (
        <div className="space-y-4">
          <h2 className="type-title-sm">Prioritized sections</h2>
          {data.sections.map((sec) => (
            <article key={sec.section + sec.copy_headline} className={appCardSurface}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="type-label-md text-[var(--color-ink)]">{sec.section}</h3>
                <span className="rounded-[var(--radius-pill)] border border-[var(--color-hairline)] px-3 py-1 type-caption">
                  {sec.action}
                </span>
              </div>
              {sec.current_problems?.length ? (
                <ul className="type-body-sm mt-3 list-disc space-y-1 pl-5 text-[var(--color-muted)]">
                  {sec.current_problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              ) : null}
              <p className="type-body-sm mt-3 text-[var(--color-muted)]">{sec.recommended_solution}</p>
              <p className="type-caption mt-2 text-[var(--color-muted-medium)]">{sec.visual_direction}</p>
              <div className="mt-4 rounded-[var(--radius-sm)] bg-[var(--color-surface-beige)] p-4">
                <p className="type-label-md text-[var(--color-ink)]">{sec.copy_headline}</p>
                <p className="type-body-sm mt-1 text-[var(--color-muted)]">{sec.copy_subheadline}</p>
                <p className="type-body-sm mt-3 font-medium text-[var(--color-ink)]">CTA: {sec.copy_cta}</p>
              </div>
              <p className="type-caption mt-3 text-[var(--color-muted-medium)]">{sec.expected_impact}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={appBtnSecondary}
                  disabled={loading}
                  onClick={() => void copyCta(sec)}
                >
                  {copiedKey === sectionKey(sec) ? "Copied CTA" : `Copy CTA · ${sec.action.replace(/_/g, " ")}`}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
