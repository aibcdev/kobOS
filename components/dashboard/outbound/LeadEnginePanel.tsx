"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { appBtnPrimary, appBtnSecondary, appCardSurface } from "@/lib/app-ui-classes";

export type LeadProspectRow = {
  id: string;
  name: string;
  city: string;
  country: string;
  websiteUrl: string | null;
  contactEmail: string | null;
  reviewCount: number | null;
  rating: number | null;
  kobOpportunityScore: number | null;
  opportunities: string[];
  hasTikTok: boolean;
  deliveryPlatforms: string[];
  platformRank: number | null;
  platformRankPercentile: number | null;
  locationCount: number | null;
  websiteStale: boolean;
  status: string;
  createdAt: string;
};

type Props = {
  prospects: LeadProspectRow[];
  restaurantId: string;
};

export function LeadEnginePanel({ prospects, restaurantId }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [minScore, setMinScore] = useState(60);

  const filtered = prospects.filter(
    (p) => p.status === "ANALYZED" && (p.kobOpportunityScore ?? 0) >= minScore,
  );

  async function patchProspect(id: string, status: "QUEUED" | "ARCHIVED") {
    setBusyId(id);
    setErr(null);
    try {
      const res = await fetch(`/api/lead-prospects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, status }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErr(data.error ?? "Update failed");
        return;
      }
      setMsg(status === "QUEUED" ? "Lead queued for email approval." : "Lead archived.");
      router.refresh();
    } catch {
      setErr("Network error");
    } finally {
      setBusyId(null);
    }
  }

  async function approveBatch() {
    setBatchBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/lead-prospects/approve-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, max: 25 }),
      });
      const data = (await res.json()) as { queued?: number; skipped?: number; error?: string };
      if (!res.ok) {
        setErr(data.error ?? "Batch failed");
        return;
      }
      setMsg(`Queued ${data.queued ?? 0} leads for email approval (${data.skipped ?? 0} skipped).`);
      router.refresh();
    } catch {
      setErr("Network error");
    } finally {
      setBatchBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="type-caption flex items-center gap-2 text-[var(--color-muted-medium)]">
          Min score
          <input
            type="number"
            min={0}
            max={100}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value) || 0)}
            className="w-16 rounded-[var(--radius-default)] border border-[var(--color-hairline)] px-2 py-1 text-sm"
          />
        </label>
        {filtered.length > 0 ? (
          <button type="button" className={appBtnPrimary} disabled={batchBusy} onClick={approveBatch}>
            {batchBusy ? "…" : `Approve top ${Math.min(25, filtered.length)} for email`}
          </button>
        ) : null}
      </div>
      {err ? <p className="type-body-sm text-red-700">{err}</p> : null}
      {msg ? <p className="type-body-sm text-[var(--color-primary)]">{msg}</p> : null}

      {prospects.length === 0 ? (
        <p className={`${appCardSurface} type-body-sm text-[var(--color-muted)]`}>
          No prospects yet. Lead Finder runs daily at 06:00 UTC.
        </p>
      ) : (
        <ul className="space-y-4">
          {prospects.map((p) => (
            <li key={p.id} className={appCardSurface}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="type-label-md text-[var(--color-ink)]">{p.name}</p>
                  <p className="type-caption text-[var(--color-muted-medium)]">
                    {p.city}, {p.country} · {p.status}
                    {p.kobOpportunityScore != null ? ` · KOB ${p.kobOpportunityScore}/100` : ""}
                    {p.reviewCount != null ? ` · ${p.reviewCount} reviews` : ""}
                    {p.rating != null ? ` · ${p.rating.toFixed(1)}★` : ""}
                    {p.hasTikTok ? " · TikTok" : " · no TikTok"}
                    {p.deliveryPlatforms.length
                      ? ` · ${p.deliveryPlatforms.join("+")}`
                      : ""}
                    {p.platformRankPercentile != null
                      ? ` · top ${Math.round(p.platformRankPercentile * 100)}%`
                      : ""}
                    {p.locationCount != null ? ` · ${p.locationCount} loc` : ""}
                    {p.websiteStale ? " · stale site" : ""}
                  </p>
                  {p.contactEmail ? (
                    <p className="type-caption mt-1 text-[var(--color-muted)]">{p.contactEmail}</p>
                  ) : null}
                </div>
                {p.status === "ANALYZED" ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === p.id || (p.kobOpportunityScore ?? 0) < 60}
                      className={appBtnSecondary}
                      onClick={() => patchProspect(p.id, "QUEUED")}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      className={appBtnSecondary}
                      onClick={() => patchProspect(p.id, "ARCHIVED")}
                    >
                      Archive
                    </button>
                  </div>
                ) : null}
              </div>
              {p.opportunities.length > 0 ? (
                <ul className="type-body-sm mt-3 list-disc space-y-1 pl-5 text-[var(--color-muted)]">
                  {p.opportunities.slice(0, 6).map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
