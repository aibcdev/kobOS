"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { RequestedConfirmModal } from "@/components/dashboard/RequestedConfirmModal";
import { appBtnPrimary, appBtnSecondary, appLinkMuted } from "@/lib/app-ui-classes";
import type { DemandPerformanceSummary } from "@/lib/demand-engine/actions";
import type { StructuredOffer } from "@/lib/demand-engine/types";
import { discountLabelFromOffer } from "@/lib/demand-engine/types";
import { withRestaurantQuery } from "@/lib/dashboard/nav";
import { marketingCopy } from "@/lib/marketing/copy";

export type DemandInboxRec = {
  id: string;
  title: string;
  reason: string;
  confidence: number;
  estimatedExtraCustomers: number;
  estimatedExtraRevenue: number;
  offer: StructuredOffer | Record<string, unknown>;
};

export type DemandInboxLive = {
  id: string;
  title: string;
  discountLabel: string | null;
  status: string;
  validFrom: string;
  validTo: string;
  channels: string[];
};

function confidenceLabel(n: number): "High" | "Medium" | "Low" {
  if (n >= 75) return "High";
  if (n >= 55) return "Medium";
  return "Low";
}

function customerRange(n: number): string {
  if (n <= 0) return "—";
  const low = Math.max(1, Math.round(n * 0.65));
  return `~${low}–${n}`;
}

function revenueRange(n: number): string {
  if (n <= 0) return "—";
  const low = Math.max(10, Math.round(n * 0.65));
  return `£${low.toLocaleString()}–${n.toLocaleString()}`;
}

function offerLabel(rec: DemandInboxRec): string {
  const offer = rec.offer as StructuredOffer;
  if (offer?.headline == null) return rec.title;
  return discountLabelFromOffer({
    headline: String(offer.headline || rec.title),
    description: String(offer.description || rec.reason),
    discountType: (offer.discountType as StructuredOffer["discountType"]) || "percent",
    discountValue: offer.discountValue,
    discountLabel: offer.discountLabel,
    validFrom: String(offer.validFrom || new Date().toISOString()),
    validTo: String(offer.validTo || new Date().toISOString()),
  });
}

export function DemandInbox({
  restaurantId,
  restaurantName,
  city,
  initialRecs,
  initialLive,
  performance,
}: {
  restaurantId: string;
  restaurantName: string;
  city: string | null;
  initialRecs: DemandInboxRec[];
  initialLive: DemandInboxLive[];
  performance: DemandPerformanceSummary;
}) {
  const router = useRouter();
  const [recs, setRecs] = useState(initialRecs);
  const [live, setLive] = useState(initialLive);
  const [perf] = useState(performance);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(() => new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function actRec(id: string, action: "approve" | "dismiss") {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/demand-engine/recommendations/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string | { formErrors?: string[] };
      };
      if (!res.ok) {
        const msg =
          typeof json.error === "string"
            ? json.error
            : json.error?.formErrors?.[0] || `Could not ${action}`;
        setError(msg);
        return;
      }
      if (action === "dismiss") {
        setRecs((prev) => prev.filter((r) => r.id !== id));
      } else {
        setRequestedIds((prev) => new Set(prev).add(id));
        setShowConfirm(true);
      }
      startTransition(() => router.refresh());
    } catch {
      setError(`Network error — could not ${action}`);
    } finally {
      setBusyId(null);
    }
  }

  async function pauseOffer(id: string) {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/demand-engine/offers/${id}/pause`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Could not pause");
        return;
      }
      setLive((prev) => prev.filter((o) => o.id !== id));
      startTransition(() => router.refresh());
    } catch {
      setError("Network error — could not pause");
    } finally {
      setBusyId(null);
    }
  }

  const meta = [restaurantName, city].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <RequestedConfirmModal open={showConfirm} onClose={() => setShowConfirm(false)} />
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-head text-3xl font-semibold tracking-tight text-[var(--color-ink)]">Demand</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{meta}</p>
        </div>
        <Link
          href={withRestaurantQuery("/dashboard", restaurantId)}
          className={`${appBtnSecondary} no-underline`}
        >
          Today
        </Link>
      </header>

      <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">
        {marketingCopy.positioning.demandPurpose}
      </p>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <section className="mt-8">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-medium)]">
          Recommended
        </h2>

        {recs.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-[var(--color-hairline)] bg-white px-4 py-5 text-sm text-[var(--color-muted)]">
            Nothing to approve right now. KOB checks quiet times, weather, and what&apos;s worked
            before. New ideas show up here when they&apos;re worth your time.
          </p>
        ) : (
          <div className="mt-3 space-y-4">
            {recs.map((rec) => {
              const busy = isPending || busyId === rec.id;
              const label = offerLabel(rec);
              const requested = requestedIds.has(rec.id);
              return (
                <article
                  key={rec.id}
                  className="rounded-2xl border border-[var(--color-hairline)] bg-white p-5 sm:p-6"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                    Quiet window
                  </p>
                  <h3 className="mt-1 font-head text-xl font-semibold text-[var(--color-ink)]">
                    {label}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
                    <span className="font-medium text-[var(--color-ink)]">Why now · </span>
                    {rec.reason}
                  </p>

                  <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <dt className="text-[11px] text-[var(--color-muted-medium)]">Extra customers</dt>
                      <dd className="mt-0.5 font-semibold tabular-nums text-[var(--color-ink)]">
                        {customerRange(rec.estimatedExtraCustomers)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-[var(--color-muted-medium)]">Extra revenue</dt>
                      <dd className="mt-0.5 font-semibold tabular-nums text-[var(--color-ink)]">
                        {revenueRange(rec.estimatedExtraRevenue)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-[var(--color-muted-medium)]">Confidence</dt>
                      <dd className="mt-0.5 font-semibold text-[var(--color-ink)]">
                        {confidenceLabel(rec.confidence)}
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-3 text-xs text-[var(--color-muted-medium)]">
                    We&apos;ll publish · Website · Google post
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-4">
                    {requested ? (
                      <span className="inline-flex min-h-10 items-center rounded-xl bg-amber-50 px-4 text-sm font-semibold text-amber-950">
                        Requested
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void actRec(rec.id, "approve")}
                          className={`${appBtnPrimary} disabled:opacity-50`}
                        >
                          {busyId === rec.id ? "Requesting…" : "Approve"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void actRec(rec.id, "dismiss")}
                          className="text-sm text-[var(--color-muted)] underline-offset-2 hover:underline disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
            <p className="text-sm text-[var(--color-muted-medium)]">
              No more recommendations right now. We&apos;ll add new ones when quiet periods or weather
              shift.
            </p>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-medium)]">
          Live now
        </h2>
        {live.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-[var(--color-hairline)] bg-white px-4 py-5 text-sm text-[var(--color-muted)]">
            No live offers yet. Approve above — we&apos;ll publish and update your dashboard within 48
            hours.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {live.map((o) => {
              const busy = busyId === o.id;
              return (
                <li
                  key={o.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-hairline)] bg-white px-4 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--color-ink)]">
                      {o.discountLabel || o.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                      {o.channels.length ? o.channels.join(" · ") : "Website"}
                      {o.status === "PAUSED" ? " · Paused" : ""}
                    </p>
                  </div>
                  {o.status === "LIVE" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void pauseOffer(o.id)}
                      className={`${appBtnSecondary} disabled:opacity-50`}
                    >
                      {busy ? "…" : "Pause"}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10 rounded-2xl border border-[var(--color-hairline)] bg-white p-5 sm:p-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-medium)]">
          Last 30 days
        </h2>
        {perf.offersRun === 0 && perf.extraCustomers === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Performance appears after your first offer has run. We measure extra customers, not clicks.
          </p>
        ) : (
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-[11px] text-[var(--color-muted-medium)]">Extra customers</dt>
              <dd className="mt-0.5 font-head text-2xl font-semibold tabular-nums text-[var(--color-ink)]">
                ~{perf.extraCustomers}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-[var(--color-muted-medium)]">Est. extra revenue</dt>
              <dd className="mt-0.5 font-head text-2xl font-semibold tabular-nums text-[var(--color-ink)]">
                £{perf.estimatedRevenue.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-[var(--color-muted-medium)]">Offers run</dt>
              <dd className="mt-0.5 font-head text-2xl font-semibold tabular-nums text-[var(--color-ink)]">
                {perf.offersRun}
              </dd>
            </div>
          </dl>
        )}
        {perf.bestOfferTitle ? (
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Best · {perf.bestOfferTitle}
          </p>
        ) : null}
      </section>

      <p className="mt-8 pb-8">
        <Link
          href={withRestaurantQuery("/dashboard/demand-engine/google-ads", restaurantId)}
          className={appLinkMuted}
        >
          Ads tools (advanced)
        </Link>
      </p>
    </div>
  );
}
