"use client";

import { useCallback, useState } from "react";
import type { AuditVisualIntelligenceResult } from "@/lib/audit/visual-intelligence";
import { appBtnPrimary, appBtnSecondary, appCardSurface } from "@/lib/app-ui-classes";

export type BrandAssetWire = {
  id: string;
  type: string;
  url: string | null;
  qualityScore: number;
};

export type BrandBreakdown = {
  foodPhotography: number;
  video: number;
  brandConsistency: number;
  heroImagery: number;
};

type FoodDish = {
  dish_name: string;
  current_assessment: string;
  improvement_brief: string;
  ai_generation_prompt: string;
  video_idea: string;
};

type Props = {
  restaurantId: string;
  restaurantName: string;
  visualScore: number;
  breakdown: BrandBreakdown;
  lastImprovedLabel: string;
  assets: BrandAssetWire[];
  /** Optional: headline from latest linked visibility audit / Browserbase screenshot heuristics. */
  pixelMetrics?: AuditVisualIntelligenceResult | null;
  /** Override hero copy (e.g. Visuals studio page). */
  heroEyebrow?: string;
  heroTitle?: string;
  heroSubtitle?: string;
};

function scoreColor(score: number) {
  if (score >= 75) return "text-emerald-600";
  if (score >= 55) return "text-amber-600";
  return "text-red-600";
}

function MetricBar({ label, value }: { label: string; value: number }) {
  const v = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div>
      <div className="mb-1 flex justify-between type-caption text-[var(--color-muted)]">
        <span>{label}</span>
        <span className="tabular-nums text-[var(--color-ink)]">{v}/100</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--color-surface-beige)] ring-1 ring-[var(--color-hairline)]">
        <div
          className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-500"
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}

export function BrandVisualsWireframe({
  restaurantId,
  restaurantName,
  visualScore,
  breakdown,
  lastImprovedLabel,
  assets,
  pixelMetrics,
  heroEyebrow,
  heroTitle,
  heroSubtitle,
}: Props) {
  const [modal, setModal] = useState<BrandAssetWire | null>(null);
  const [foodLoading, setFoodLoading] = useState(false);
  const [foodError, setFoodError] = useState<string | null>(null);
  const [dishes, setDishes] = useState<FoodDish[] | null>(null);
  const [wireframeNotice, setWireframeNotice] = useState<string | null>(null);

  const runFoodPhotography = useCallback(
    async (dishCategories?: string[]) => {
      setFoodError(null);
      setWireframeNotice(null);
      setFoodLoading(true);
      try {
        const res = await fetch("/api/growth-agent/food-photography", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            restaurantId,
            dishCategories: dishCategories?.length ? dishCategories : undefined,
          }),
        });
        const data = (await res.json()) as { ok?: boolean; dishes?: FoodDish[]; error?: string };
        if (!res.ok) {
          setFoodError(
            res.status === 402 ? "Starter plan required — open Billing to upgrade." : (data.error ?? "Request failed"),
          );
          setDishes(null);
          return;
        }
        setDishes(data.dishes ?? null);
      } catch {
        setFoodError("Network error");
        setDishes(null);
      }
      setFoodLoading(false);
    },
    [restaurantId],
  );

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-4 border-b border-[var(--color-hairline)] pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="type-caption text-[var(--color-muted-medium)]">{heroEyebrow ?? "Visuals & branding"}</p>
          <h1 className="type-title-md mt-1 font-head">{heroTitle ?? restaurantName}</h1>
          <p className="type-body-md mt-2 max-w-xl text-pretty text-[var(--color-muted)]">
            {heroSubtitle ?? "Visual health blends stored scans, food assets, and brand signals."}
          </p>
          <p className="type-caption mt-2 text-[var(--color-muted-medium)]">{lastImprovedLabel}</p>
        </div>
        <div className="flex items-center gap-4">
          <div
            className={`flex h-28 w-28 flex-col items-center justify-center rounded-full border-4 border-[var(--color-hairline)] bg-[var(--color-surface-beige)] ${scoreColor(visualScore)}`}
          >
            <span className="text-3xl font-bold tabular-nums">{visualScore}</span>
            <span className="type-caption text-[var(--color-muted-medium)]">/ 100</span>
          </div>
          <p className="type-body-sm max-w-xs text-[var(--color-muted)]">Visual health blends stored scans, food assets, and brand signals.</p>
        </div>
      </header>

      {pixelMetrics ? (
        <section className={`${appCardSurface} space-y-6`}>
          <div>
            <h2 className="type-title-sm">Pixel-level signals (latest linked audit)</h2>
            <p className="type-body-sm mt-2 text-[var(--color-muted)]">
              Heuristic scores from the last public visibility scan screenshot — not a substitute for a creative director.
            </p>
          </div>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
            <div className="flex shrink-0 flex-col items-center justify-center">
              <span className={`text-5xl font-bold tabular-nums ${scoreColor(pixelMetrics.overallHeuristic)}`}>
                {Math.round(pixelMetrics.overallHeuristic)}
              </span>
              <span className="type-caption text-[var(--color-muted-medium)]">overall heuristic</span>
            </div>
            <div className="min-w-0 flex-1 space-y-4">
              <MetricBar label="Food warmth / appetite bias" value={pixelMetrics.foodWarmthHeuristic} />
              <MetricBar label="Sharpness & clarity" value={pixelMetrics.sharpnessScore} />
              <MetricBar label="Color vibrancy" value={pixelMetrics.vibrancyScore} />
              <MetricBar label="Contrast" value={pixelMetrics.contrastScore} />
              <p className="type-caption text-[var(--color-muted-medium)]">{pixelMetrics.notes}</p>
            </div>
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="type-title-sm">Current visual health</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ["Food photography", breakdown.foodPhotography],
              ["Video", breakdown.video],
              ["Brand consistency", breakdown.brandConsistency],
              ["Hero imagery", breakdown.heroImagery],
            ] as const
          ).map(([label, score]) => (
            <span
              key={label}
              className="rounded-[var(--radius-pill)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 py-2 type-caption font-medium text-[var(--color-ink)]"
            >
              {label} · <span className={scoreColor(score)}>{score}</span>
            </span>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="type-title-sm">Food photography studio</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={appBtnSecondary}
              disabled={foodLoading}
              onClick={() => void runFoodPhotography()}
            >
              {foodLoading ? "Running…" : "Run full visual scan"}
            </button>
            <button
              type="button"
              className={appBtnPrimary}
              disabled={foodLoading}
              onClick={() => void runFoodPhotography()}
            >
              {foodLoading ? "Running…" : "Generate new hero assets"}
            </button>
          </div>
        </div>
        {assets.length === 0 ? (
          <p className={`${appCardSurface} type-body-sm text-[var(--color-muted)]`}>
            No images yet. Upload food shots in Settings → brand assets (pipeline). Placeholders below show the intended
            card layout.
          </p>
        ) : null}
        {foodError ? <p className="type-body-sm text-red-700">{foodError}</p> : null}
        {wireframeNotice ? (
          <p className="type-body-sm mt-2 text-[var(--color-muted)]" role="status">
            {wireframeNotice}
          </p>
        ) : null}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(assets.length ? assets : PLACEHOLDER_ASSETS).map((a) => (
            <article key={a.id} className={`${appCardSurface} overflow-hidden p-0`}>
              <div className="relative aspect-[4/3] bg-[var(--color-surface-beige)]">
                {a.url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- wireframe accepts arbitrary storage URLs
                  <img src={a.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center type-caption text-[var(--color-muted-medium)]">
                    Thumbnail
                  </div>
                )}
                <span
                  className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-semibold ${scoreColor(a.qualityScore)} bg-white/90`}
                >
                  {a.qualityScore}
                </span>
              </div>
              <div className="p-4">
                <p className="type-caption text-[var(--color-muted-medium)]">{a.type.replace(/_/g, " ")}</p>
                <button
                  type="button"
                  className={`${appBtnSecondary} mt-3 w-full`}
                  disabled={foodLoading}
                  onClick={() => {
                    setModal(a);
                    setDishes(null);
                    setFoodError(null);
                  }}
                >
                  Improve
                </button>
              </div>
            </article>
          ))}
        </div>
        {dishes?.length ? (
          <div className="mt-8 space-y-4 border-t border-[var(--color-hairline)] pt-8">
            <h3 className="type-title-sm">Latest AI food analysis</h3>
            {dishes.map((d, idx) => (
              <div key={`${d.dish_name}-${idx}`} className={`${appCardSurface} space-y-2`}>
                <p className="type-label-md text-[var(--color-ink)]">{d.dish_name}</p>
                <p className="type-caption text-[var(--color-muted)]">{d.current_assessment}</p>
                <p className="type-body-sm text-[var(--color-muted)]">{d.improvement_brief}</p>
                <details className="type-caption text-[var(--color-muted-medium)]">
                  <summary className="cursor-pointer">AI image prompt</summary>
                  <p className="mt-2 whitespace-pre-wrap text-[var(--color-muted)]">{d.ai_generation_prompt}</p>
                </details>
                <p className="type-caption text-[var(--color-muted-medium)]">Video: {d.video_idea}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="type-title-sm">Video content ideas</h2>
        <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
          {["Hero steam reveal", "Chef plating ASMR", "Neighborhood regulars"].map((title) => (
            <div key={title} className={`${appCardSurface} w-64 shrink-0`}>
              <div className="aspect-video rounded-[var(--radius-sm)] bg-[var(--color-ink)]/10" />
              <p className="type-label-md mt-3 text-[var(--color-ink)]">{title}</p>
              <p className="type-caption text-[var(--color-muted-medium)]">15s · Reel / TikTok</p>
              <button
                type="button"
                className={`${appBtnSecondary} mt-3 w-full`}
                disabled={foodLoading}
                onClick={() => void runFoodPhotography()}
              >
                Generate script &amp; prompt
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="type-title-sm">Brand identity analyzer</h2>
        <div className={`mt-4 grid gap-4 md:grid-cols-2 ${appCardSurface}`}>
          <div>
            <p className="type-caption font-semibold text-[var(--color-muted-medium)]">Palette extractor</p>
            <div className="mt-3 flex gap-2">
              {["#094413", "#f9f3ed", "#2c2c2c", "#088924"].map((c) => (
                <span key={c} className="h-10 w-10 rounded-full ring-1 ring-black/10" style={{ backgroundColor: c }} title={c} />
              ))}
            </div>
            <p className="type-caption mt-3 text-[var(--color-muted)]">Recommended swatches (wireframe)</p>
            <button
              type="button"
              className={`${appBtnSecondary} mt-3`}
              onClick={() => {
                setWireframeNotice("Palette apply is not wired yet — use Brand scans and Growth Agent for live changes.");
              }}
            >
              Apply palette
            </button>
          </div>
          <div>
            <p className="type-caption font-semibold text-[var(--color-muted-medium)]">Typography &amp; mood</p>
            <p className="type-body-sm mt-3 text-[var(--color-muted)]">
              Serif headlines + humanist body for hospitality premium. Mood board generator ties to Growth Agent prompts.
            </p>
            <button
              type="button"
              className={`${appBtnSecondary} mt-3`}
              onClick={() => {
                setWireframeNotice("Mood board export is on the roadmap — run food photography above for AI-ready prompts.");
              }}
            >
              Generate mood board
            </button>
          </div>
        </div>
      </section>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog">
          <div className={`max-h-[90vh] w-full max-w-lg overflow-y-auto ${appCardSurface}`}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="type-title-sm">Improve asset</h3>
              <button type="button" className="type-caption text-[var(--color-muted)]" onClick={() => setModal(null)}>
                Close
              </button>
            </div>
            <p className="type-caption mt-2 text-[var(--color-muted-medium)]">{modal.type.replace(/_/g, " ")}</p>
            <p className="type-body-sm mt-4 text-[var(--color-muted)]">
              Runs the food photography agent for this restaurant. Results include reshoot briefs and AI image prompts.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                className={appBtnPrimary}
                disabled={foodLoading}
                onClick={() => void runFoodPhotography()}
              >
                {foodLoading ? "Generating…" : "Generate enhanced version"}
              </button>
              <button
                type="button"
                className={appBtnSecondary}
                disabled={foodLoading}
                onClick={() => void runFoodPhotography()}
              >
                {foodLoading ? "Generating…" : "Photoshoot brief"}
              </button>
            </div>
            {foodError ? <p className="type-body-sm mt-4 text-red-700">{foodError}</p> : null}
            {dishes?.length ? (
              <div className="mt-6 space-y-4 border-t border-[var(--color-hairline)] pt-6">
                <p className="type-caption font-semibold text-[var(--color-muted-medium)]">Top dishes (AI)</p>
                {dishes.map((d, idx) => (
                  <div key={`${d.dish_name}-${idx}`} className="rounded-[var(--radius-sm)] bg-[var(--color-surface-beige)] p-3">
                    <p className="type-label-md text-[var(--color-ink)]">{d.dish_name}</p>
                    <p className="type-caption mt-2 text-[var(--color-muted)]">{d.current_assessment}</p>
                    <p className="type-body-sm mt-2 text-[var(--color-muted)]">{d.improvement_brief}</p>
                    <p className="type-caption mt-2 text-[var(--color-muted-medium)]">Video: {d.video_idea}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const PLACEHOLDER_ASSETS: BrandAssetWire[] = [
  { id: "p1", type: "FOOD_PHOTO", url: null, qualityScore: 58 },
  { id: "p2", type: "FOOD_PHOTO", url: null, qualityScore: 64 },
  { id: "p3", type: "BRANDING", url: null, qualityScore: 52 },
];
