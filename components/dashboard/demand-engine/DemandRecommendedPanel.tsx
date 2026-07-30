"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { RequestedConfirmModal } from "@/components/dashboard/RequestedConfirmModal";
import { appBtnPrimary, appCardSurface } from "@/lib/app-ui-classes";
import type { StructuredOffer } from "@/lib/demand-engine/types";
import { discountLabelFromOffer } from "@/lib/demand-engine/types";

export type DemandRecCard = {
  id: string;
  title: string;
  reason: string;
  confidence: number;
  impactScore: number;
  estimatedExtraCustomers: number;
  estimatedExtraRevenue: number;
  offer: StructuredOffer | Record<string, unknown>;
  templateKey: string | null;
  createdAt: string;
};

export function DemandRecommendedPanel({
  restaurantId,
  initial,
}: {
  restaurantId: string;
  initial: DemandRecCard[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(() => new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function act(id: string, action: "approve" | "dismiss") {
    setError(null);
    setPendingId(id);
    try {
      const res = await fetch(`/api/demand-engine/recommendations/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || `Could not ${action}`);
        return;
      }
      if (action === "dismiss") {
        setItems((prev) => prev.filter((r) => r.id !== id));
      } else {
        setRequestedIds((prev) => new Set(prev).add(id));
        setShowConfirm(true);
      }
      startTransition(() => router.refresh());
    } catch {
      setError(`Network error — could not ${action}`);
    } finally {
      setPendingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className={`${appCardSurface} text-sm text-[var(--color-muted)]`}>
        No pending recommendations. Check back after the next scoring run, or open{" "}
        <Link
          href={`/dashboard/demand-engine/live?r=${encodeURIComponent(restaurantId)}`}
          className="font-medium text-[var(--color-primary)]"
        >
          Live offers
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <RequestedConfirmModal open={showConfirm} onClose={() => setShowConfirm(false)} />
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}
      {items.map((rec) => {
        const offer = rec.offer as StructuredOffer;
        const label =
          offer?.headline != null
            ? discountLabelFromOffer({
                headline: String(offer.headline || rec.title),
                description: String(offer.description || rec.reason),
                discountType: (offer.discountType as StructuredOffer["discountType"]) || "percent",
                discountValue: offer.discountValue,
                discountLabel: offer.discountLabel,
                validFrom: String(offer.validFrom || new Date().toISOString()),
                validTo: String(offer.validTo || new Date().toISOString()),
              })
            : rec.title;
        const busy = isPending || pendingId === rec.id;
        const requested = requestedIds.has(rec.id);

        return (
          <article key={rec.id} className={appCardSurface}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-wide text-[var(--color-primary)] uppercase">
                  Recommended
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[var(--color-ink)]">{rec.title}</h2>
                <p className="mt-1 text-sm font-medium text-[var(--color-forest-mid)]">{label}</p>
              </div>
              <div className="text-right text-xs text-[var(--color-muted)]">
                <p>Confidence {rec.confidence}%</p>
                <p>Impact {rec.impactScore}</p>
              </div>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">{rec.reason}</p>

            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <div>
                <p className="text-xs text-[var(--color-muted-medium)]">Est. extra customers</p>
                <p className="font-semibold text-[var(--color-ink)]">+{rec.estimatedExtraCustomers}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-muted-medium)]">Est. extra revenue</p>
                <p className="font-semibold text-[var(--color-ink)]">
                  £{rec.estimatedExtraRevenue.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {requested ? (
                <span className="inline-flex min-h-10 items-center rounded-xl bg-amber-50 px-4 text-sm font-semibold text-amber-950">
                  Requested
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void act(rec.id, "approve")}
                    className={`${appBtnPrimary} disabled:opacity-50`}
                  >
                    {pendingId === rec.id ? "Requesting…" : "Approve"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void act(rec.id, "dismiss")}
                    className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-white px-5 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-warm)] disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                </>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
