"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DashboardNavIconGlyph } from "@/components/dashboard/DashboardNavIcon";
import type { TodayBriefPayload } from "@/lib/chief-of-staff/types";
import type { TodayJourneySnapshot } from "@/lib/dashboard/load-today-journey";
import type { DashboardNavIcon } from "@/lib/dashboard/nav";
import {
  ctaHrefForOperatorTask,
  toOperatorTask,
  type OperatorTaskView,
} from "@/lib/dashboard/operator-task";
import { withRestaurantQuery } from "@/lib/dashboard/nav";
import { appBtnPrimary } from "@/lib/app-ui-classes";

export type TodayDemandHint = {
  id: string;
  title: string;
  impactLabel?: string | null;
};

export type TodayOpenRequest = {
  id: string;
  title: string;
  notes: string;
  status: string;
};

function greetingLine(name: string) {
  const hour = new Date().getHours();
  const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const short = name.split(/\s+/)[0] || name;
  return `${part}, ${short}`;
}

function fixKeyForTask(task: OperatorTaskView): string {
  return `today-${task.kind}-${task.id}`.slice(0, 120);
}

function iconForTask(task: OperatorTaskView): DashboardNavIcon {
  switch (task.kind) {
    case "reply_reviews":
      return "reviews";
    case "add_photos":
      return "brand";
    case "fix_cta":
      return "website";
    case "gbp_basics":
      return "listings";
    case "website":
      return "website";
    case "demand":
    case "demand_offer":
      return "demand";
    default:
      return "requests";
  }
}

function requestStatusForTask(
  task: OperatorTaskView,
  requests: TodayOpenRequest[],
): "REQUESTED" | "IN_PROGRESS" | "DELIVERED" | null {
  const key = fixKeyForTask(task);
  const match = requests.find(
    (r) =>
      r.notes.includes(`fixKey=${key}`) ||
      r.title === task.title ||
      r.notes.toLowerCase().includes(task.title.toLowerCase()),
  );
  if (!match) return null;
  if (match.status === "DELIVERED") return "DELIVERED";
  if (match.status === "IN_PROGRESS") return "IN_PROGRESS";
  if (match.status === "CANCELLED") return null;
  return "REQUESTED";
}

function ActionStatusBadge({ status }: { status: "REQUESTED" | "IN_PROGRESS" | "DELIVERED" }) {
  if (status === "DELIVERED") {
    return (
      <span className="inline-flex min-h-11 shrink-0 items-center rounded-xl bg-emerald-50 px-4 text-sm font-semibold text-emerald-900">
        Delivered
      </span>
    );
  }
  return (
    <span className="inline-flex min-h-11 shrink-0 items-center rounded-xl bg-amber-50 px-4 text-sm font-semibold text-amber-950">
      {status === "IN_PROGRESS" ? "In progress" : "Requested"}
    </span>
  );
}

function PriorityRow({
  task,
  restaurantId,
  auditId,
  initialStatus,
  onRequested,
}: {
  task: OperatorTaskView;
  restaurantId: string;
  auditId: string | null;
  initialStatus: "REQUESTED" | "IN_PROGRESS" | "DELIVERED" | null;
  onRequested: (req: TodayOpenRequest) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(initialStatus);
  const isDemand = task.kind === "demand" || task.kind === "demand_offer";

  async function runAction() {
    setBusy(true);
    setError(null);
    try {
      if (isDemand) {
        const res = await fetch(
          `/api/demand-engine/recommendations/${encodeURIComponent(task.id)}/approve`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ restaurantId }),
          },
        );
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? "Could not approve offer.");
          return;
        }
        setStatus("DELIVERED");
        return;
      }

      const fixKey = fixKeyForTask(task);
      const res = await fetch("/api/audit-fixes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          fixKey,
          title: task.title,
          detail: task.why,
          auditId: auditId ?? undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        request?: TodayOpenRequest;
        upgradeRequired?: boolean;
      };
      if (!res.ok) {
        if (data.upgradeRequired) {
          try {
            const checkout = await fetch("/api/billing/checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ restaurantId, tier: "starter" }),
            });
            const checkoutData = (await checkout.json().catch(() => ({}))) as {
              url?: string;
              error?: string;
            };
            if (checkout.ok && checkoutData.url) {
              window.location.href = checkoutData.url;
              return;
            }
            setError(checkoutData.error ?? "Start a free trial to request this.");
            return;
          } catch {
            setError("Could not start trial checkout.");
            return;
          }
        }
        setError(data.error ?? "Could not submit request.");
        return;
      }
      const nextStatus =
        data.request?.status === "IN_PROGRESS"
          ? "IN_PROGRESS"
          : data.request?.status === "DELIVERED"
            ? "DELIVERED"
            : "REQUESTED";
      setStatus(nextStatus);
      if (data.request) {
        onRequested({
          id: data.request.id,
          title: data.request.title ?? task.title,
          notes: data.request.notes ?? `fixKey=${fixKey}`,
          status: data.request.status ?? "REQUESTED",
        });
      }
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  const cta =
    task.ctaLabel === "Open replies"
      ? "Open replies"
      : task.ctaLabel === "Approve"
        ? "Approve"
        : task.ctaLabel === "Update photos"
          ? "Update photos"
          : "Fix this";

  const surfaceHref = ctaHrefForOperatorTask(task, restaurantId, withRestaurantQuery);

  return (
    <li className="border-t border-[var(--color-hairline)] py-6 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-start gap-3 sm:gap-4">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-warm)] text-[var(--color-muted)]">
          <DashboardNavIconGlyph icon={iconForTask(task)} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="font-head text-lg font-semibold leading-snug text-[var(--color-ink)]">
              {task.title}
            </p>
            {task.customersDelta != null ? (
              <p className="shrink-0 text-sm font-semibold tabular-nums text-[var(--color-primary)]">
                +{task.customersDelta} customers/month
              </p>
            ) : null}
          </div>
          <p className="mt-1 max-w-xl text-sm leading-snug text-[var(--color-muted)]">{task.why}</p>
          {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {status ? (
              <ActionStatusBadge status={status} />
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void runAction()}
                className={`${appBtnPrimary} !min-h-11 shrink-0 !rounded-xl !px-5 !py-2.5 text-sm disabled:opacity-50`}
              >
                {busy ? (isDemand ? "Approving…" : "Requesting…") : cta}
              </button>
            )}
            <Link
              href={surfaceHref}
              className="text-sm text-[var(--color-muted)] no-underline underline-offset-2 hover:text-[var(--color-ink)] hover:underline"
            >
              Open
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}

function PotentialRecoveredBar({ recovered, total }: { recovered: number; total: number }) {
  const safeTotal = Math.max(total, 1);
  const pct = Math.max(0, Math.min(100, Math.round((recovered / safeTotal) * 100)));
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-medium)]">
            Potential recovered
          </p>
          <p className="mt-1 font-head text-xl font-semibold tabular-nums text-[var(--color-ink)]">
            +{recovered}{" "}
            <span className="font-medium text-[var(--color-muted)]">/ +{total} customers</span>
          </p>
        </div>
        <p className="text-sm text-[var(--color-muted)]">Complete today&apos;s fixes.</p>
      </div>
      <div
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--color-muted-faint)]"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Potential customers recovered"
      >
        <div
          className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function TodayOwnerHome({
  restaurantId,
  restaurantName,
  brief: initialBrief,
  briefNeedsRefresh = false,
  journey,
  website = null,
  demandHints = [],
  openRequests: initialOpenRequests = [],
  auditId = null,
  welcome,
  previewMode,
}: {
  restaurantId: string;
  restaurantName: string;
  city: string | null;
  cuisineType: string | null;
  brief: TodayBriefPayload;
  briefNeedsRefresh?: boolean;
  journey: TodayJourneySnapshot | null;
  website?: string | null;
  demandHints?: TodayDemandHint[];
  openRequests?: TodayOpenRequest[];
  auditId?: string | null;
  welcome?: boolean;
  previewMode?: boolean;
}) {
  const [brief, setBrief] = useState(initialBrief);
  const [openRequests, setOpenRequests] = useState(initialOpenRequests);

  const refreshBrief = useCallback(async () => {
    if (previewMode) return;
    try {
      const res = await fetch("/api/chief-of-staff/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId }),
        signal: AbortSignal.timeout(25_000),
      });
      if (!res.ok) return;
      const next = (await res.json()) as TodayBriefPayload;
      if (next.tasks?.length) {
        setBrief(next);
      } else if (next.summary) {
        setBrief((prev) => ({
          ...prev,
          summary: {
            ...prev.summary,
            ...next.summary,
            holidayBlock: next.summary.holidayBlock ?? prev.summary.holidayBlock,
            taskCount: Math.max(next.summary.taskCount, prev.summary.taskCount),
          },
          greeting: next.greeting || prev.greeting,
        }));
      }
    } catch {
      /* keep audit priorities */
    }
  }, [previewMode, restaurantId]);

  useEffect(() => {
    if (!briefNeedsRefresh || previewMode) return;
    void refreshBrief();
  }, [briefNeedsRefresh, previewMode, refreshBrief]);

  const openTasks = useMemo(() => {
    const fromBrief = brief.tasks
      .filter((t) => t.status === "PENDING")
      .map((t) =>
        toOperatorTask({
          id: t.id,
          title: t.title,
          detail: t.detail,
          impactLabel: t.impactLabel,
          category: t.category,
          estimatedMinutes: t.estimatedMinutes,
          revenueHighGbp: t.revenueHighGbp,
          kind: "task",
        }),
      );
    const demand = demandHints.map((d) =>
      toOperatorTask({
        id: d.id,
        title: d.title,
        impactLabel: d.impactLabel,
        category: "MARKETING",
        kind: "demand",
      }),
    );
    const merged = [...fromBrief, ...demand.slice(0, 1)];
    const seen = new Set<string>();
    const out: OperatorTaskView[] = [];
    for (const t of merged) {
      const key = `${t.kind}:${t.title.slice(0, 40).toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(t);
      if (out.length >= 3) break;
    }
    return out;
  }, [brief.tasks, demandHints]);

  const report = journey?.report ?? null;
  const overall =
    journey?.overallScore ?? report?.stages.find((s) => s.id === "outcome")?.score ?? null;
  const customersHigh = report?.evidence.customersHigh ?? 0;
  const headlineCustomers =
    customersHigh > 0
      ? customersHigh
      : openTasks.reduce((s, t) => s + (t.customersDelta ?? 0), 0) || 69;

  const recovered = useMemo(() => {
    let sum = 0;
    for (const task of openTasks) {
      const st = requestStatusForTask(task, openRequests);
      if (st === "REQUESTED" || st === "IN_PROGRESS" || st === "DELIVERED") {
        sum += task.customersDelta ?? 0;
      }
    }
    return sum;
  }, [openTasks, openRequests]);

  const fullReportHref = journey?.auditSlug
    ? `/audit/${journey.auditSlug}`
    : journey?.auditId
      ? `/audit/${journey.auditId}`
      : withRestaurantQuery("/dashboard/analytics", restaurantId);

  const holiday = brief.summary.holidayBlock;
  const greet = greetingLine(restaurantName);
  const siteUrl = journey?.websiteUrl ?? website;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      {welcome ? (
        <p className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Venue added — your first three fixes are below.
        </p>
      ) : null}

      {/* Above the fold: one job */}
      <header>
        <p className="font-head text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl">
          {greet}
        </p>
        <h1 className="mt-6 font-head text-3xl font-semibold leading-[1.15] tracking-tight text-[var(--color-ink)] sm:text-4xl">
          You could recover
          <br />
          <span className="text-[var(--color-primary)]">+{headlineCustomers} customers</span> every
          month
        </h1>
        <p className="mt-4 text-base text-[var(--color-muted)]">
          {openTasks.length > 0
            ? "We've found the 3 biggest things holding you back."
            : "Priorities appear once your journey snapshot finishes."}
        </p>
      </header>

      <ol className="mt-8">
        {openTasks.length === 0 ? (
          <li className="py-4 text-sm text-[var(--color-muted)]">
            Nothing needs you right now — we&apos;ll surface the next fix as soon as we spot it.
          </li>
        ) : (
          openTasks.map((task) => (
            <PriorityRow
              key={task.id}
              task={task}
              restaurantId={restaurantId}
              auditId={auditId}
              initialStatus={requestStatusForTask(task, openRequests)}
              onRequested={(req) =>
                setOpenRequests((prev) => {
                  const next = prev.filter((r) => r.id !== req.id);
                  return [req, ...next];
                })
              }
            />
          ))
        )}
      </ol>

      <p className="mt-6 flex items-center gap-2 text-sm text-[var(--color-muted)]">
        <span aria-hidden>✓</span>
        We&apos;ll help with every step.
      </p>

      {/* Below the fold: secondary */}
      <section className="mt-16 border-t border-[var(--color-hairline)] pt-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-medium)]">
          Also useful
        </p>

        <div className="mt-6">
          <PotentialRecoveredBar recovered={recovered} total={headlineCustomers} />
        </div>

        <ul className="mt-8 space-y-3 text-sm">
          {overall != null ? (
            <li className="flex items-center justify-between gap-3 text-[var(--color-muted)]">
              <span>Audit score</span>
              <span className="font-semibold tabular-nums text-[var(--color-ink)]">{overall}/100</span>
            </li>
          ) : null}
          {holiday ? (
            <li className="flex items-center justify-between gap-3 text-[var(--color-muted)]">
              <span>
                {holiday.eventName} in {holiday.daysAway} days
              </span>
              <Link
                href={withRestaurantQuery("/dashboard/creative", restaurantId)}
                className="font-medium text-[var(--color-primary)] no-underline hover:underline"
              >
                Planner
              </Link>
            </li>
          ) : null}
          {siteUrl ? (
            <li className="flex items-center justify-between gap-3 text-[var(--color-muted)]">
              <span>Website</span>
              <Link
                href={withRestaurantQuery("/dashboard/website", restaurantId)}
                className="max-w-[60%] truncate font-medium text-[var(--color-primary)] no-underline hover:underline"
              >
                Open
              </Link>
            </li>
          ) : null}
          <li className="flex items-center justify-between gap-3 text-[var(--color-muted)]">
            <span>Full report</span>
            <Link
              href={fullReportHref}
              className="font-medium text-[var(--color-primary)] no-underline hover:underline"
            >
              View
            </Link>
          </li>
          <li className="flex items-center justify-between gap-3 text-[var(--color-muted)]">
            <span>Requests</span>
            <Link
              href={withRestaurantQuery("/dashboard/requests", restaurantId)}
              className="font-medium text-[var(--color-primary)] no-underline hover:underline"
            >
              Open
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
