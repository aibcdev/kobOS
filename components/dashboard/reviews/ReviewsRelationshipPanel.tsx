"use client";

import { useEffect, useState } from "react";
import { appBtnPrimary, appBtnSecondary, appCardSurface } from "@/lib/app-ui-classes";

export type ReviewListItem = {
  id: string;
  rating: number;
  body: string;
  reviewerName: string | null;
  reviewedAt: string | null;
  replied: boolean;
};

type ReviewResult = {
  best_reply: string;
  personalization_score: number;
  personalization_why: string;
  relationship_next_step: string;
  long_term_nurture_idea: string;
};

function formatRelative(iso: string | null): string {
  if (!iso) return "Date unknown";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "Date unknown";
  const days = Math.floor((Date.now() - t) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

export function ReviewsRelationshipPanel({ restaurantId, reviews }: { restaurantId: string; reviews: ReviewListItem[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(reviews[0]?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [draftReply, setDraftReply] = useState("");

  const selected = reviews.find((r) => r.id === selectedId) ?? null;

  useEffect(() => {
    if (result?.best_reply) {
      setDraftReply(result.best_reply);
    }
  }, [result?.best_reply]);

  async function generate(forId?: string) {
    const id = forId ?? selectedId;
    if (!id) return;
    setError(null);
    setResult(null);
    setDraftReply("");
    setLoading(true);
    try {
      const res = await fetch("/api/growth-agent/review-relationship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, reviewId: id }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        best_reply?: string;
        personalization_score?: number;
        personalization_why?: string;
        relationship_next_step?: string;
        long_term_nurture_idea?: string;
      };
      if (!res.ok) {
        setError(
          res.status === 402 ? "Starter plan required — open Billing to upgrade." : (data.error ?? "Request failed"),
        );
        setLoading(false);
        return;
      }
      if (
        data.best_reply != null &&
        data.personalization_score != null &&
        data.personalization_why != null &&
        data.relationship_next_step != null &&
        data.long_term_nurture_idea != null
      ) {
        setResult({
          best_reply: data.best_reply,
          personalization_score: data.personalization_score,
          personalization_why: data.personalization_why,
          relationship_next_step: data.relationship_next_step,
          long_term_nurture_idea: data.long_term_nurture_idea,
        });
        setDraftReply(data.best_reply);
      } else {
        setError("Unexpected response shape");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  if (reviews.length === 0) {
    return (
      <div className={appCardSurface}>
        <p className="type-body-sm text-[var(--color-muted)]">
          No reviews in KOB yet. Import or sync Google reviews, then pick one in this inbox.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
      <div className="space-y-4 lg:col-span-2">
        <h2 className="type-title-sm">Review inbox</h2>
        <p className="type-body-sm text-[var(--color-muted)]">Select a guest review — then draft an on-brand reply with Growth Agent.</p>
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedId(r.id);
                  setResult(null);
                  setDraftReply("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedId(r.id);
                    setResult(null);
                    setDraftReply("");
                  }
                }}
                className={`cursor-pointer rounded-[var(--radius-default)] border px-4 py-4 text-left transition-colors ${
                  selectedId === r.id
                    ? "border-[var(--color-ink)] bg-[var(--color-surface-warm)] ring-1 ring-[var(--color-ink)]/15"
                    : "border-[var(--color-hairline)] bg-[var(--color-surface-soft)] hover:border-amber-500/50 hover:bg-[var(--color-surface-warm)]"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="type-label-md text-[var(--color-ink)]">{r.reviewerName ?? "Guest"}</span>
                    <span className="ml-2 text-amber-600">{"★".repeat(Math.min(5, Math.max(0, r.rating)))}</span>
                    {r.replied ? (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 type-caption text-emerald-900">
                        Replied
                      </span>
                    ) : (
                      <span className="ml-2 rounded-full bg-[var(--color-surface-beige)] px-2 py-0.5 type-caption text-[var(--color-muted)]">
                        Needs reply
                      </span>
                    )}
                  </div>
                  <span className="type-caption text-[var(--color-muted-medium)]">{formatRelative(r.reviewedAt)}</span>
                </div>
                <p className="type-body-md mt-3 text-pretty text-[var(--color-muted)]">{r.body || "(no text)"}</p>
                <button
                  type="button"
                  className={`${appBtnSecondary} mt-4`}
                  disabled={loading}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(r.id);
                    setResult(null);
                    setDraftReply("");
                    void generate(r.id);
                  }}
                >
                  Generate smart reply
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="lg:sticky lg:top-24">
        <div className={appCardSurface}>
          <h2 className="type-title-sm">Smart reply assistant</h2>
          {!selected ? (
            <p className="type-body-sm mt-4 text-[var(--color-muted)]">Select a review to get started.</p>
          ) : (
            <>
              <p className="type-caption mt-3 text-[var(--color-muted-medium)]">
                {selected.reviewerName ?? "Guest"} · {selected.rating}★
              </p>
              <textarea
                className="mt-4 min-h-[200px] w-full resize-y rounded-[var(--radius-default)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-3 py-2 type-body-sm text-[var(--color-ink)]"
                placeholder="Personalized reply will appear here after you generate…"
                value={draftReply}
                onChange={(e) => setDraftReply(e.target.value)}
                aria-label="Reply draft"
              />
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button type="button" disabled={loading || !selectedId} onClick={() => void generate()} className={`${appBtnPrimary} flex-1`}>
                  {loading ? "Generating…" : result ? "Regenerate" : "Generate draft"}
                </button>
                <button
                  type="button"
                  className={`${appBtnSecondary} flex-1`}
                  disabled={!draftReply.trim()}
                  onClick={() => void navigator.clipboard.writeText(draftReply)}
                >
                  Copy reply
                </button>
              </div>
              <button
                type="button"
                className={`${appBtnSecondary} mt-2 w-full opacity-80`}
                disabled
                title="Post-to-Google wiring ships next — copy and paste in Business Profile for now."
              >
                Approve &amp; post (soon)
              </button>
              {error ? <p className="type-body-sm mt-3 text-red-700">{error}</p> : null}
              {result ? (
                <div className="mt-6 space-y-4 border-t border-[var(--color-hairline)] pt-6">
                  <section>
                    <h3 className="type-caption font-semibold uppercase text-[var(--color-muted-medium)]">Personalization</h3>
                    <p className="type-body-sm mt-2 text-[var(--color-muted)]">
                      {result.personalization_score}/10 — {result.personalization_why}
                    </p>
                  </section>
                  <section>
                    <h3 className="type-caption font-semibold uppercase text-[var(--color-muted-medium)]">Next step</h3>
                    <p className="type-body-sm mt-2 text-[var(--color-muted)]">{result.relationship_next_step}</p>
                  </section>
                  <section>
                    <h3 className="type-caption font-semibold uppercase text-[var(--color-muted-medium)]">Long-term nurture</h3>
                    <p className="type-body-sm mt-2 text-[var(--color-muted)]">{result.long_term_nurture_idea}</p>
                  </section>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
