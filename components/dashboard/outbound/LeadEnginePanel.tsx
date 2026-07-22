"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { appBtnPrimary, appBtnSecondary, appCardSurface } from "@/lib/app-ui-classes";

export type LeadProspectRow = {
  id: string;
  name: string;
  city: string;
  country: string;
  websiteUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  hasContactForm: boolean;
  weakWebsite: boolean;
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
  totalFound: number;
  contactableCount: number;
};

const PAGE_SIZE = 100;

export function LeadEnginePanel({ prospects, restaurantId, totalFound, contactableCount }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [minScore, setMinScore] = useState(40);
  const [emailOnly, setEmailOnly] = useState(true);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    return prospects.filter((p) => {
      if (p.status !== "ANALYZED" && p.status !== "DISCOVERED") return false;
      if ((p.kobOpportunityScore ?? 0) < minScore) return false;
      if (emailOnly && !p.contactEmail) return false;
      return true;
    });
  }, [emailOnly, minScore, prospects]);

  const pageSlice = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

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
      <p className="type-body-sm text-[var(--color-muted)]">
        {totalFound.toLocaleString()} restaurants found · {contactableCount.toLocaleString()} with email ·
        sorted by opportunity score.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="type-caption flex items-center gap-2 text-[var(--color-muted-medium)]">
          Min score
          <input
            type="number"
            min={0}
            max={100}
            value={minScore}
            onChange={(e) => {
              setMinScore(Number(e.target.value) || 0);
              setPage(0);
            }}
            className="w-16 rounded-[var(--radius-default)] border border-[var(--color-hairline)] px-2 py-1 text-sm"
          />
        </label>
        <label className="type-caption flex items-center gap-2 text-[var(--color-muted-medium)]">
          <input
            type="checkbox"
            checked={emailOnly}
            onChange={(e) => {
              setEmailOnly(e.target.checked);
              setPage(0);
            }}
          />
          Email only
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
          No prospects yet. Run <code className="text-xs">npm run lead-engine:bulk-import</code> to fill the
          list.
        </p>
      ) : (
        <>
          <p className="type-caption text-[var(--color-muted-medium)]">
            Showing {pageSlice.length} of {filtered.length.toLocaleString()} matching · page {page + 1} of{" "}
            {pageCount}
          </p>
          <ul className="space-y-4">
            {pageSlice.map((p, idx) => (
              <li key={p.id} className={appCardSurface}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="type-label-md text-[var(--color-ink)]">
                      #{page * PAGE_SIZE + idx + 1} {p.name}
                    </p>
                    <p className="type-caption text-[var(--color-muted-medium)]">
                      {p.city}, {p.country}
                      {p.kobOpportunityScore != null ? ` · KOB ${p.kobOpportunityScore}/100` : ""}
                      {p.reviewCount != null ? ` · ${p.reviewCount} reviews` : ""}
                      {p.rating != null ? ` · ${p.rating.toFixed(1)}★` : ""}
                      {p.deliveryPlatforms.length ? ` · ${p.deliveryPlatforms.join("+")}` : ""}
                      {p.platformRank != null ? ` · #${p.platformRank} delivery` : ""}
                    </p>
                    {p.websiteUrl ? (
                      <p className="type-caption mt-1 text-[var(--color-muted)]">
                        <a
                          href={p.websiteUrl.startsWith("http") ? p.websiteUrl : `https://${p.websiteUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          {p.websiteUrl.replace(/^https?:\/\//, "")}
                        </a>
                      </p>
                    ) : null}
                    {p.contactEmail ? (
                      <p className="type-caption mt-1 font-medium text-[var(--color-ink)]">{p.contactEmail}</p>
                    ) : (
                      <p className="type-caption mt-1 text-amber-800">No email yet</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === p.id || !p.contactEmail}
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
                </div>
              </li>
            ))}
          </ul>
          {pageCount > 1 ? (
            <div className="flex gap-2">
              <button
                type="button"
                className={appBtnSecondary}
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className={appBtnSecondary}
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
