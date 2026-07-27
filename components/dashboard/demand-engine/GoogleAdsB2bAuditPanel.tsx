"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { appBtnPrimary, appBtnSecondary, appCardSurface, appInput } from "@/lib/app-ui-classes";
import type { B2bAuditAdsPlan } from "@/lib/marketing/google-ads-b2b-audit";
import { B2B_AUDIT_SEED_KEYWORDS } from "@/lib/marketing/google-ads-b2b-audit";

type SavedCampaign = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  payload: B2bAuditAdsPlan | Record<string, unknown>;
};

export function GoogleAdsB2bAuditPanel({
  restaurantId,
  initialCampaigns,
}: {
  restaurantId: string;
  initialCampaigns: SavedCampaign[];
}) {
  const router = useRouter();
  const [dailyBudgetGbp, setDailyBudgetGbp] = useState(30);
  const [locations, setLocations] = useState("United Kingdom, Ireland, Australia");
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<B2bAuditAdsPlan | null>(null);
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
          mode: "b2b_audit",
          dailyBudgetGbp,
          locations: locations
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        plan?: B2bAuditAdsPlan;
        campaignId?: string;
      };
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Could not create campaign");
        return;
      }
      if (json.plan) setPlan(json.plan);
      if (json.campaignId) {
        setCampaignId(json.campaignId);
        setCampaigns((prev) => [
          {
            id: json.campaignId!,
            title: json.plan?.campaignName ?? "KOB B2B Audit Ads",
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
          <h2 className="text-base font-semibold text-[var(--color-ink)]">
            B2B Search · free audit
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Reach <strong className="font-medium text-[var(--color-ink)]">restaurant owners</strong>{" "}
            searching for marketing, tips, or software. Landing page:{" "}
            <code className="text-xs">trykob.com/audit</code>. Not diner / local radius ads.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-[var(--color-muted-medium)] uppercase">
            Seed keywords included
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {B2B_AUDIT_SEED_KEYWORDS.map((k) => (
              <li
                key={k}
                className="rounded-md bg-[var(--color-muted-faint)] px-2 py-1 text-xs text-[var(--color-ink)]"
              >
                {k}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-[var(--color-ink)]">
            Daily budget (£)
            <input
              className={appInput}
              type="number"
              min={10}
              max={500}
              value={dailyBudgetGbp}
              onChange={(e) => setDailyBudgetGbp(Number(e.target.value) || 30)}
            />
          </label>
          <label className="block text-sm font-medium text-[var(--color-ink)]">
            Locations (comma-separated)
            <input
              className={appInput}
              value={locations}
              onChange={(e) => setLocations(e.target.value)}
              placeholder="United Kingdom"
            />
          </label>
        </div>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={busy || isPending} className={appBtnPrimary}>
          {busy ? "Building…" : "Build B2B audit campaign"}
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
                {plan.keywords.length} keywords · {plan.adGroups.length} ad groups · £
                {plan.dailyBudgetGbp}/day · {plan.locations.join(", ")}
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
            {plan.adGroups.map((g) => (
              <div key={g.name}>
                <p className="text-xs font-semibold tracking-wide text-[var(--color-muted-medium)] uppercase">
                  {g.name}
                </p>
                <ul className="mt-2 space-y-1 text-sm text-[var(--color-ink)]">
                  {g.headlines.slice(0, 4).map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--color-muted)]">
            {plan.notes.slice(0, 5).map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {campaigns.length > 0 ? (
        <div className={appCardSurface}>
          <h2 className="text-base font-semibold text-[var(--color-ink)]">Saved B2B Ads drafts</h2>
          <ul className="mt-3 divide-y divide-[var(--color-hairline)]">
            {campaigns.map((c) => {
              const p = c.payload as Partial<B2bAuditAdsPlan>;
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-ink)]">{c.title}</p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {c.status}
                      {p.dailyBudgetGbp != null ? ` · £${p.dailyBudgetGbp}/day` : ""}
                      {Array.isArray(p.keywords) ? ` · ${p.keywords.length} kw` : ""}
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
