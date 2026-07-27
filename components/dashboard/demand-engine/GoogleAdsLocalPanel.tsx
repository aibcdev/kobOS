"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { appBtnPrimary, appBtnSecondary, appCardSurface, appInput } from "@/lib/app-ui-classes";
import type { LocalAdsGoal, LocalAdsPlan } from "@/lib/demand-engine/google-ads-local";

type SavedCampaign = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  payload: LocalAdsPlan | Record<string, unknown>;
};

export function GoogleAdsLocalPanel({
  restaurantId,
  defaultArea,
  initialCampaigns,
}: {
  restaurantId: string;
  defaultArea: string;
  initialCampaigns: SavedCampaign[];
}) {
  const router = useRouter();
  const [area, setArea] = useState(defaultArea);
  const [radiusKm, setRadiusKm] = useState(5);
  const [dailyBudgetGbp, setDailyBudgetGbp] = useState(25);
  const [goal, setGoal] = useState<LocalAdsGoal>("covers");
  const [promoHeadline, setPromoHeadline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<LocalAdsPlan | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [busy, setBusy] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    setPlan(null);
    setCampaignId(null);
    try {
      const res = await fetch("/api/demand-engine/google-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          area: area.trim(),
          radiusKm,
          dailyBudgetGbp,
          goal,
          promoHeadline: promoHeadline.trim() || undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string | { formErrors?: string[] };
        plan?: LocalAdsPlan;
        campaignId?: string;
      };
      if (!res.ok) {
        const err =
          typeof json.error === "string"
            ? json.error
            : "Could not create campaign — check area and Places API key.";
        setError(err);
        return;
      }
      if (json.plan) setPlan(json.plan);
      if (json.campaignId) {
        setCampaignId(json.campaignId);
        setCampaigns((prev) => [
          {
            id: json.campaignId!,
            title: json.plan?.campaignName ?? "Local Google Ads",
            status: "DRAFT",
            createdAt: new Date().toISOString(),
            payload: json.plan ?? {},
          },
          ...prev,
        ]);
      }
      startTransition(() => router.refresh());
    } catch {
      setError("Network error — could not create campaign");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createCampaign} className={`${appCardSurface} space-y-4`}>
        <div>
          <h2 className="text-base font-semibold text-[var(--color-ink)]">Build a local campaign</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            We geocode the area with Google Places, sample nearby restaurants, then generate Search
            keywords, ads, and a Google Ads Editor CSV. Campaigns start paused — you review before
            spend.
          </p>
        </div>

        <label className="block text-sm font-medium text-[var(--color-ink)]">
          Area (city, neighbourhood, or postcode)
          <input
            className={appInput}
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="e.g. Shoreditch, London or SW1A"
            required
            maxLength={120}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium text-[var(--color-ink)]">
            Radius (km)
            <input
              className={appInput}
              type="number"
              min={1}
              max={40}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value) || 5)}
            />
          </label>
          <label className="block text-sm font-medium text-[var(--color-ink)]">
            Daily budget (£)
            <input
              className={appInput}
              type="number"
              min={5}
              max={500}
              value={dailyBudgetGbp}
              onChange={(e) => setDailyBudgetGbp(Number(e.target.value) || 25)}
            />
          </label>
          <label className="block text-sm font-medium text-[var(--color-ink)]">
            Goal
            <select
              className={appInput}
              value={goal}
              onChange={(e) => setGoal(e.target.value as LocalAdsGoal)}
            >
              <option value="covers">Fill covers / bookings</option>
              <option value="takeaway">Takeaway / delivery</option>
              <option value="brand">Brand / discovery</option>
            </select>
          </label>
        </div>

        <label className="block text-sm font-medium text-[var(--color-ink)]">
          Promo headline (optional, max 30 chars)
          <input
            className={appInput}
            value={promoHeadline}
            onChange={(e) => setPromoHeadline(e.target.value.slice(0, 30))}
            placeholder="e.g. Midweek 20% off"
            maxLength={30}
          />
        </label>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={busy || isPending} className={appBtnPrimary}>
          {busy ? "Building…" : "Create local Google Ads campaign"}
        </button>
      </form>

      {plan && campaignId ? (
        <div className={`${appCardSurface} space-y-4`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wide text-[var(--color-primary)] uppercase">
                Draft ready
              </p>
              <h3 className="mt-1 text-lg font-semibold text-[var(--color-ink)]">{plan.campaignName}</h3>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {plan.areaLabel} · {plan.radiusKm} km · £{plan.dailyBudgetGbp}/day · ~£
                {plan.estimatedMonthlySpendGbp}/mo
              </p>
            </div>
            <a
              className={appBtnSecondary}
              href={`/api/demand-engine/google-ads/${encodeURIComponent(campaignId)}/export?restaurantId=${encodeURIComponent(restaurantId)}`}
            >
              Download Ads Editor CSV
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold tracking-wide text-[var(--color-muted-medium)] uppercase">
                Keywords ({plan.keywords.length})
              </p>
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm text-[var(--color-ink)]">
                {plan.keywords.map((k) => (
                  <li key={`${k.matchType}-${k.text}`}>
                    <span className="text-[var(--color-muted)]">[{k.matchType}]</span> {k.text}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-[var(--color-muted-medium)] uppercase">
                Ad headlines
              </p>
              <ul className="mt-2 space-y-1 text-sm text-[var(--color-ink)]">
                {plan.headlines.slice(0, 8).map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          </div>

          {plan.nearbyVenues.length > 0 ? (
            <div>
              <p className="text-xs font-semibold tracking-wide text-[var(--color-muted-medium)] uppercase">
                Nearby Google businesses sampled
              </p>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                {plan.nearbyVenues
                  .map((v) => (v.rating != null ? `${v.name} (${v.rating.toFixed(1)}★)` : v.name))
                  .join(" · ")}
              </p>
            </div>
          ) : null}

          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--color-muted)]">
            {plan.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {campaigns.length > 0 ? (
        <div className={appCardSurface}>
          <h2 className="text-base font-semibold text-[var(--color-ink)]">Saved local Ads drafts</h2>
          <ul className="mt-3 divide-y divide-[var(--color-hairline)]">
            {campaigns.map((c) => {
              const p = c.payload as Partial<LocalAdsPlan>;
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-ink)]">{c.title}</p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {c.status}
                      {p.areaLabel ? ` · ${p.areaLabel}` : ""}
                      {p.dailyBudgetGbp != null ? ` · £${p.dailyBudgetGbp}/day` : ""}
                    </p>
                  </div>
                  <a
                    className="text-sm font-medium text-[var(--color-primary)]"
                    href={`/api/demand-engine/google-ads/${encodeURIComponent(c.id)}/export?restaurantId=${encodeURIComponent(restaurantId)}`}
                  >
                    CSV
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
