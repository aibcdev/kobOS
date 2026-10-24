"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  SlideCommit,
  StatusMark,
  type StatusMarkState,
} from "@/components/kob-micro";
import type { ActionView } from "@/lib/agent/access";
import {
  ACTIVE_STATUSES,
  actionsApi,
  type ApproveScope,
} from "@/lib/agent/action-client";
import { cn } from "@/lib/kob/utils";

const noopSubscribe = () => () => {};

const SKIP_REASONS = [
  "Wrong tone",
  "Wrong facts",
  "Not now",
  "Don't do this",
] as const;

export function markFor(status: string): StatusMarkState {
  if (status === "AWAITING_APPROVAL" || status === "PROPOSED") return "warning";
  if (status === "APPROVED" || status === "EXECUTING") return "running";
  if (status === "EXECUTED") return "executed";
  if (status === "VERIFYING") return "verifying";
  if (status === "VERIFIED") return "verified";
  if (status === "FAILED") return "failed";
  return "idle";
}

/** Polls GET /api/actions/[id] while the action is in flight: 1.5s, backing off to 10s. */
export function useLiveAction(
  initial: ActionView,
): [ActionView, (next: ActionView) => void] {
  const [view, setView] = useState(initial);
  useEffect(() => {
    if (!ACTIVE_STATUSES.has(view.status)) return;
    let delay = 1500;
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const tick = async () => {
      const res = await actionsApi.get(view.id).catch(() => null);
      if (stopped) return;
      if (res?.action) {
        setView(res.action);
        if (!ACTIVE_STATUSES.has(res.action.status)) return;
      }
      delay = Math.min(10_000, Math.round(delay * 1.5));
      timer = setTimeout(tick, delay);
    };
    timer = setTimeout(tick, delay);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [view.id, view.status]);
  return [view, setView];
}

export function ActionStatus({
  view,
  className,
}: {
  view: ActionView;
  className?: string;
}) {
  return (
    <p
      className={cn("flex items-center gap-2 text-sm", className)}
      data-testid="action-status"
      data-status={view.status}
    >
      <StatusMark state={markFor(view.status)} />
      <span data-testid="action-status-text">{view.ownerStatus}</span>
    </p>
  );
}

/**
 * Spec 1 §7.7. Approve (once) · Approve all like this today (TASK, when the action belongs to a task) ·
 * Always do this (ALWAYS, eligible types, with limits) · Skip with a reason. Risk ≥ 51 approves by slide.
 */
export function ApprovalCard({
  action,
  detailHref,
  onSettled,
}: {
  action: ActionView;
  detailHref?: string;
  onSettled?: (view: ActionView) => void;
}) {
  const [view, setView] = useLiveAction(action);
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"none" | "always" | "skip">("none");
  const [limits, setLimits] = useState({ minRating: 4, maxPerDay: 20 });
  const waiting =
    view.status === "AWAITING_APPROVAL" || view.status === "PROPOSED";
  const isReview = view.actionType.startsWith("gbp.review.");

  async function approve(
    scope: ApproveScope,
    extra: { limits?: Record<string, number>; confirm?: "slide" } = {},
  ) {
    setBusy(true);
    setError(null);
    const res = await actionsApi.approve(view.id, { scope, ...extra });
    setBusy(false);
    if (res.action) {
      setView(res.action);
      onSettled?.(res.action);
    }
    if (!res.ok) setError(res.error ?? "Couldn't approve that.");
    return res.ok;
  }

  async function skip(reason: string) {
    setBusy(true);
    const res = await actionsApi.reject(view.id, reason);
    setBusy(false);
    setSheet("none");
    if (res.action) {
      setView(res.action);
      onSettled?.(res.action);
    }
    if (!res.ok) setError(res.error ?? "Couldn't skip that.");
  }

  return (
    <article
      className="rounded-3xl border border-line bg-paper p-5 shadow-sm"
      data-testid="approval-card"
      data-action-id={view.id}
      data-hydrated={hydrated}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{view.title}</h3>
          {view.summary && view.summary !== view.title ? (
            <p className="mt-1 text-sm text-muted">{view.summary}</p>
          ) : null}
        </div>
        {detailHref ? (
          <Link
            href={detailHref}
            className="shrink-0 text-xs text-muted underline"
          >
            Details
          </Link>
        ) : null}
      </header>

      <ActionStatus view={view} className="mt-4" />
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {waiting ? (
        <div className="mt-4 space-y-2">
          {view.requiresSlide ? (
            <SlideCommit
              label="Slide to approve"
              successLabel="Approved"
              onCommit={() => approve("ONCE", { confirm: "slide" })}
            />
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void approve("ONCE")}
              className="h-12 w-full rounded-full bg-espresso text-sm font-medium text-paper disabled:opacity-60"
            >
              Approve
            </button>
          )}
          <div className="flex flex-wrap gap-2 text-sm">
            {view.taskKey ? (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void approve(
                    "TASK",
                    view.requiresSlide ? { confirm: "slide" } : {},
                  )
                }
                className="rounded-full border border-line px-4 py-2"
              >
                Approve all like this today
              </button>
            ) : null}
            {view.alwaysEligible ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => setSheet(sheet === "always" ? "none" : "always")}
                className="rounded-full border border-line px-4 py-2"
              >
                Always do this
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => setSheet(sheet === "skip" ? "none" : "skip")}
              className="rounded-full border border-line px-4 py-2"
            >
              Skip
            </button>
          </div>

          {sheet === "always" ? (
            <form
              className="mt-2 space-y-3 rounded-2xl bg-bone p-4 text-sm"
              onSubmit={(e) => {
                e.preventDefault();
                void approve("ALWAYS", {
                  limits: isReview ? limits : { maxPerDay: limits.maxPerDay },
                  ...(view.requiresSlide ? { confirm: "slide" as const } : {}),
                });
              }}
            >
              <p className="text-muted">
                KOB will do this without asking, within these limits. You can
                turn it off in Settings → Permissions.
              </p>
              {isReview ? (
                <label className="flex items-center justify-between gap-3">
                  Only for reviews rated at least
                  <select
                    value={limits.minRating}
                    onChange={(e) =>
                      setLimits({
                        ...limits,
                        minRating: Number(e.target.value),
                      })
                    }
                    className="rounded-lg border border-line bg-paper px-2 py-1"
                  >
                    {[3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}★
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="flex items-center justify-between gap-3">
                At most per day
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={limits.maxPerDay}
                  onChange={(e) =>
                    setLimits({ ...limits, maxPerDay: Number(e.target.value) })
                  }
                  className="w-20 rounded-lg border border-line bg-paper px-2 py-1"
                />
              </label>
              {isReview ? (
                <p className="text-xs text-muted">
                  Serious complaints always come to you first.
                </p>
              ) : null}
              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-espresso px-4 py-2 font-medium text-paper"
              >
                Turn on
              </button>
            </form>
          ) : null}

          {sheet === "skip" ? (
            <div
              className="mt-2 flex flex-wrap gap-2 text-sm"
              role="group"
              aria-label="Why skip?"
            >
              {SKIP_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  disabled={busy}
                  onClick={() => void skip(reason)}
                  className="rounded-full bg-bone px-3 py-1.5"
                >
                  {reason}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
