"use client";

import { useState } from "react";
import { appBtnPrimary, appBtnSecondary, appCardSurface } from "@/lib/app-ui-classes";

type BriefResponse = {
  brief: {
    keyword: string;
    coreQuestion: string;
    aeoBlock: string;
    h2Map: string[];
    reader: string;
    edge: string;
    edgeType: string;
    cta: string;
    eeatSignal: string;
  };
  articleMarkdown?: string;
  prePublishChecks: Array<{ id: string; label: string; pass: boolean }>;
  readyToPublish: boolean;
};

export function AiEraContentBriefPanel({ restaurantId }: { restaurantId: string }) {
  const [keyword, setKeyword] = useState("");
  const [edgeHint, setEdgeHint] = useState("");
  const [busy, setBusy] = useState<null | "brief" | "article">(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BriefResponse | null>(null);

  async function generate(mode: "brief" | "article") {
    const k = keyword.trim();
    if (k.length < 2) return;
    setError(null);
    setBusy(mode === "brief" ? "brief" : "article");
    try {
      const res = await fetch("/api/seo/content-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, keyword: k, mode, edgeHint: edgeHint || undefined }),
      });
      const data = (await res.json()) as BriefResponse & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Generation failed");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={`${appCardSurface} mt-8`}>
      <h2 className="type-title-sm">AI-era content brief</h2>
      <p className="type-body-sm mt-2 text-[var(--color-muted)]">
        Builds pages that rank on Google and get cited in AI Overviews — answer block, PAA structure, and a unique
        edge.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="type-caption text-[var(--color-muted-medium)]">Target keyword</span>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="rounded-[var(--radius-default)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-3 py-2 text-sm"
            placeholder="e.g. best brunch Bristol"
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="type-caption text-[var(--color-muted-medium)]">Your edge (optional)</span>
          <input
            value={edgeHint}
            onChange={(e) => setEdgeHint(e.target.value)}
            className="rounded-[var(--radius-default)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-3 py-2 text-sm"
            placeholder="e.g. our own booking data, chef interview, neighbourhood guide"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null || keyword.trim().length < 2}
          onClick={() => void generate("brief")}
          className={appBtnSecondary}
        >
          {busy === "brief" ? "Building…" : "Build brief"}
        </button>
        <button
          type="button"
          disabled={busy !== null || keyword.trim().length < 2}
          onClick={() => void generate("article")}
          className={appBtnPrimary}
        >
          {busy === "article" ? "Writing…" : "Write full article"}
        </button>
      </div>

      {error ? <p className="type-body-sm mt-3 text-red-700">{error}</p> : null}

      {result ? (
        <div className="mt-6 space-y-4 border-t border-[var(--color-hairline)] pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="type-caption font-medium text-[var(--color-ink)]">Pre-publish check</span>
            <span
              className={`type-caption rounded-full px-2 py-0.5 ${
                result.readyToPublish
                  ? "bg-green-100 text-green-800"
                  : "bg-amber-100 text-amber-900"
              }`}
            >
              {result.readyToPublish ? "Ready to publish" : "Fix before publish"}
            </span>
          </div>
          <ul className="space-y-1">
            {result.prePublishChecks.map((c) => (
              <li key={c.id} className="type-body-sm text-[var(--color-muted)]">
                {c.pass ? "✓" : "✗"} {c.label}
              </li>
            ))}
          </ul>

          <div>
            <p className="type-caption font-medium text-[var(--color-muted-medium)]">Answer block (AEO)</p>
            <p className="type-body-sm mt-1 whitespace-pre-wrap text-[var(--color-ink)]">
              {result.brief.aeoBlock}
            </p>
          </div>

          <div>
            <p className="type-caption font-medium text-[var(--color-muted-medium)]">H2 map (People Also Ask)</p>
            <ol className="type-body-sm mt-1 list-decimal pl-5 text-[var(--color-ink)]">
              {result.brief.h2Map.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ol>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 type-body-sm text-[var(--color-muted)]">
            <p>
              <span className="font-medium text-[var(--color-ink)]">Reader:</span> {result.brief.reader}
            </p>
            <p>
              <span className="font-medium text-[var(--color-ink)]">Edge:</span> {result.brief.edge}
            </p>
            <p>
              <span className="font-medium text-[var(--color-ink)]">CTA:</span> {result.brief.cta}
            </p>
            <p>
              <span className="font-medium text-[var(--color-ink)]">EEAT:</span> {result.brief.eeatSignal}
            </p>
          </div>

          {result.articleMarkdown ? (
            <div>
              <p className="type-caption font-medium text-[var(--color-muted-medium)]">Full article</p>
              <pre className="type-body-sm mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-[var(--radius-default)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4 text-[var(--color-ink)]">
                {result.articleMarkdown}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
