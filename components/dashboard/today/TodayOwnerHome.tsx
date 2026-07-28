"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { TodayBriefPayload } from "@/lib/chief-of-staff/types";
import type { TodayJourneySnapshot } from "@/lib/dashboard/load-today-journey";
import {
  toOperatorTask,
  type OperatorTaskView,
} from "@/lib/dashboard/operator-task";
import { withRestaurantQuery } from "@/lib/dashboard/nav";
import { appBtnPrimary, appBtnSecondary } from "@/lib/app-ui-classes";

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

function ProgressRing({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const r = 54;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  return (
    <div className="relative mx-auto h-36 w-36">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 128 128" aria-hidden>
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--color-muted-faint)" strokeWidth="10" />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-head text-3xl font-semibold tabular-nums leading-none text-[var(--color-ink)]">
          {clamped}
          <span className="text-lg font-medium text-[var(--color-muted)]">/100</span>
        </p>
      </div>
    </div>
  );
}

function ActionStatusBadge({ status }: { status: "REQUESTED" | "IN_PROGRESS" | "DELIVERED" }) {
  if (status === "DELIVERED") {
    return (
      <span className="inline-flex min-h-10 shrink-0 items-center rounded-xl bg-emerald-50 px-4 text-sm font-semibold text-emerald-900">
        Delivered
      </span>
    );
  }
  return (
    <span className="inline-flex min-h-10 shrink-0 items-center rounded-xl bg-amber-50 px-4 text-sm font-semibold text-amber-950">
      {status === "IN_PROGRESS" ? "In progress" : "Requested"}
    </span>
  );
}

function PriorityRow({
  index,
  task,
  restaurantId,
  auditId,
  initialStatus,
  onRequested,
}: {
  index: number;
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
        // System completes demand approve immediately.
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
        alreadyPending?: boolean;
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

  return (
    <li className="flex flex-wrap items-center gap-4 border-t border-[var(--color-hairline)] py-4 first:border-t-0 first:pt-0 last:pb-0">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-sm font-semibold text-[var(--color-primary)]">
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-snug text-[var(--color-ink)]">{task.title}</p>
        <p className="mt-1 text-sm leading-snug text-[var(--color-muted)]">{task.why}</p>
        <p className="mt-1.5 text-xs text-[var(--color-muted-medium)]">
          {task.stage}
          <span className="mx-1.5">·</span>~{task.minutes} min
          {status === "REQUESTED" || status === "IN_PROGRESS" ? (
            <>
              <span className="mx-1.5">·</span>
              Our team has this
            </>
          ) : null}
        </p>
        {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
      </div>
      {task.customersDelta != null ? (
        <p className="shrink-0 text-sm font-semibold tabular-nums text-[var(--color-primary)]">
          +{task.customersDelta} customers / month
        </p>
      ) : null}
      {status ? (
        <ActionStatusBadge status={status} />
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void runAction()}
          className={`${appBtnPrimary} !min-h-10 shrink-0 !rounded-xl !px-4 !py-2 text-sm disabled:opacity-50`}
        >
          {busy ? (isDemand ? "Approving…" : "Requesting…") : cta}
        </button>
      )}
    </li>
  );
}

function DoneThisWeek({ done }: { done: { id: string; title: string }[] }) {
  if (done.length === 0) return null;
  return (
    <section className="rounded-2xl border border-[var(--color-hairline)] bg-white/70 px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:px-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-medium)]">
        Delivered this week
      </p>
      <ul className="mt-2 space-y-1.5">
        {done.map((d) => (
          <li key={d.id} className="text-sm text-[var(--color-muted)]">
            <span className="mr-1.5 text-[var(--color-forest-mid)]">✓</span>
            {d.title}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TodayOwnerHome({
  restaurantId,
  restaurantName,
  city,
  cuisineType,
  brief,
  journey,
  demandHints = [],
  openRequests: initialOpenRequests = [],
  auditId = null,
  welcome,
}: {
  restaurantId: string;
  restaurantName: string;
  city: string | null;
  cuisineType: string | null;
  brief: TodayBriefPayload;
  journey: TodayJourneySnapshot | null;
  demandHints?: TodayDemandHint[];
  openRequests?: TodayOpenRequest[];
  auditId?: string | null;
  welcome?: boolean;
}) {
  const [openRequests, setOpenRequests] = useState(initialOpenRequests);

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
    const merged = [...demand.slice(0, 1), ...fromBrief];
    const seen = new Set<string>();
    const out: OperatorTaskView[] = [];
    for (const t of merged) {
      const key = t.kind;
      if (seen.has(key) && key !== "generic") continue;
      seen.add(key);
      out.push(t);
      if (out.length >= 3) break;
    }
    return out;
  }, [brief.tasks, demandHints]);

  // Only system/ops-delivered work belongs here — never owner clicks.
  const doneTasks = useMemo(
    () =>
      openRequests
        .filter((r) => r.status === "DELIVERED")
        .slice(0, 5)
        .map((r) => ({ id: r.id, title: r.title })),
    [openRequests],
  );

  const report = journey?.report ?? null;
  const overall =
    journey?.overallScore ?? report?.stages.find((s) => s.id === "outcome")?.score ?? null;
  const customersHigh = report?.evidence.customersHigh ?? 0;
  const customersLow = report?.evidence.customersLow ?? 0;
  const headlineCustomers =
    customersHigh > 0
      ? customersHigh
      : openTasks.reduce((s, t) => s + (t.customersDelta ?? 0), 0) || 69;

  const fullReportHref = journey?.auditSlug
    ? `/audit/${journey.auditSlug}`
    : journey?.auditId
      ? `/audit/${journey.auditId}`
      : withRestaurantQuery("/dashboard/analytics", restaurantId);

  const holiday = brief.summary.holidayBlock;
  const greet = greetingLine(restaurantName);
  const requestedCount = openRequests.filter(
    (r) => r.status === "REQUESTED" || r.status === "IN_PROGRESS",
  ).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {welcome ? (
        <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Venue added — we&apos;re mapping where guests drop off. Your first three fixes land below.
        </p>
      ) : null}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-head text-xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-2xl">
            <span className="text-[var(--color-muted)]">Dashboard</span>
            <span className="mx-2 text-[var(--color-muted-medium)]">/</span>
            {greet}!
          </h1>
          {(city || cuisineType) && (
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {[restaurantName, city, cuisineType].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {fullReportHref.startsWith("/audit") ? (
            <Link href={fullReportHref} className={`${appBtnSecondary} !min-h-10 !px-4 !py-2 text-sm no-underline`}>
              See your public view
            </Link>
          ) : null}
          <Link
            href={withRestaurantQuery("/dashboard/requests", restaurantId)}
            className={`${appBtnPrimary} !min-h-10 !px-4 !py-2 text-sm no-underline`}
          >
            Create action plan
          </Link>
        </div>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-8">
          <section className="rounded-2xl border border-[var(--color-hairline)] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-medium)]">
              Top priorities for you
            </p>
            <h2 className="mt-2 font-head text-xl font-semibold leading-snug text-[var(--color-ink)] sm:text-2xl">
              You could get{" "}
              <span className="text-[var(--color-primary)]">+{headlineCustomers} more customers</span>{" "}
              every month
            </h2>
            {customersLow > 0 && customersHigh > 0 ? (
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Est. ~{customersLow}–{customersHigh} fewer guests / month than you could be getting.
              </p>
            ) : null}
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Tap a green button to request help — it stays Requested until our team delivers. Nothing
              is marked done just because you clicked.
            </p>
            <ol className="mt-5">
              {openTasks.length === 0 ? (
                <li className="py-3 text-sm text-[var(--color-muted)]">
                  Priorities appear once your journey snapshot finishes.
                </li>
              ) : (
                openTasks.map((task, i) => (
                  <PriorityRow
                    key={task.id}
                    index={i + 1}
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
          </section>

          <DoneThisWeek done={doneTasks} />

          {holiday ? (
            <section className="overflow-hidden rounded-2xl border border-[var(--color-hairline)] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-hairline)] px-5 py-3 sm:px-6">
                <p className="font-medium text-[var(--color-ink)]">{greet}.</p>
                <span className="text-xs text-[var(--color-muted)]">Holiday engine</span>
              </div>
              <div className="grid sm:grid-cols-2">
                <div className="bg-[var(--color-primary)] px-5 py-6 text-white sm:px-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
                    Capture more bookings
                  </p>
                  <p className="mt-2 font-head text-xl font-semibold">
                    {holiday.eventName} is {holiday.daysAway} days away
                  </p>
                  <p className="mt-2 text-sm text-white/80">
                    Get ahead with drafts ready to approve — nothing goes live without you.
                  </p>
                  <Link
                    href={withRestaurantQuery("/dashboard/creative", restaurantId)}
                    className="mt-5 inline-flex min-h-10 items-center rounded-xl border border-white/40 px-4 text-sm font-semibold text-white no-underline hover:bg-white/10"
                  >
                    Plan your campaign
                  </Link>
                </div>
                <div className="px-5 py-6 sm:px-6">
                  <p className="text-sm font-medium text-[var(--color-ink)]">Get ahead</p>
                  <ul className="mt-3 space-y-3 text-sm text-[var(--color-muted)]">
                    <li className="flex justify-between gap-2">
                      <span>{holiday.emailPrepared ? "✓ Email draft ready" : "Email draft on approve"}</span>
                      <Link
                        href={withRestaurantQuery("/dashboard/creative", restaurantId)}
                        className="shrink-0 font-medium text-[var(--color-primary)] no-underline"
                      >
                        Open
                      </Link>
                    </li>
                    <li className="flex justify-between gap-2">
                      <span>
                        {holiday.instagramPrepared ? "✓ Social draft ready" : "Social draft on approve"}
                      </span>
                      <Link
                        href={withRestaurantQuery("/dashboard/content", restaurantId)}
                        className="shrink-0 font-medium text-[var(--color-primary)] no-underline"
                      >
                        Open
                      </Link>
                    </li>
                    <li className="flex justify-between gap-2">
                      <span>
                        {holiday.bannerPrepared ? "✓ Banner ready" : "Banner draft on approve"}
                      </span>
                      <Link
                        href={withRestaurantQuery("/dashboard/website", restaurantId)}
                        className="shrink-0 font-medium text-[var(--color-primary)] no-underline"
                      >
                        Open
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-5 lg:col-span-4">
          <section className="rounded-2xl border border-[var(--color-hairline)] bg-white p-5 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-medium)]">
              Your progress
            </p>
            <div className="mt-4">
              <ProgressRing score={overall ?? 0} />
            </div>
            <ul className="mt-4 space-y-2 text-left text-sm text-[var(--color-muted)]">
              <li className="flex justify-between gap-2">
                <span>Requested with us</span>
                <span className="font-medium tabular-nums text-[var(--color-ink)]">{requestedCount}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span>Open this week</span>
                <span className="font-medium tabular-nums text-[var(--color-ink)]">{openTasks.length}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span>Est. time left</span>
                <span className="font-medium tabular-nums text-[var(--color-ink)]">
                  ~{openTasks.reduce((s, t) => s + t.minutes, 0) || brief.summary.totalMinutes || 0}{" "}
                  min
                </span>
              </li>
            </ul>
            <Link
              href={fullReportHref}
              className={`${appBtnSecondary} mt-5 !min-h-10 w-full !px-4 !py-2 text-sm no-underline`}
            >
              View full report
            </Link>
          </section>

          <section className="rounded-2xl border border-[var(--color-hairline)] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-medium)]">
              Need to know
            </p>
            <ul className="mt-3 space-y-2.5 text-sm text-[var(--color-muted)]">
              {overall != null ? (
                <li>
                  Journey score{" "}
                  <span className="font-semibold tabular-nums text-[var(--color-ink)]">{overall}/100</span>
                </li>
              ) : (
                <li>Journey snapshot still running</li>
              )}
              {brief.summary.needToKnow.slice(0, 3).map((line) => (
                <li key={line}>{line}</li>
              ))}
              {brief.summary.needToKnow.length === 0 ? (
                <li>{brief.summary.revenueHealthLine}</li>
              ) : null}
            </ul>
          </section>

          <section className="rounded-2xl border border-[var(--color-hairline)] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-medium)]">
              Suggestions for you
            </p>
            {openTasks[0] ? (
              <>
                <p className="mt-3 text-sm font-medium text-[var(--color-ink)]">{openTasks[0].title}</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{openTasks[0].why}</p>
                <p className="mt-4 text-sm text-[var(--color-muted-medium)]">
                  Use the green button in Top priorities — we&apos;ll mark it Requested for the team.
                </p>
              </>
            ) : brief.summary.suggestions[0] ? (
              <p className="mt-3 text-sm text-[var(--color-muted)]">{brief.summary.suggestions[0]}</p>
            ) : (
              <p className="mt-3 text-sm text-[var(--color-muted)]">Check Demand for quiet-period offers.</p>
            )}
          </section>
        </aside>
      </div>

      <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--color-hairline)] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:px-6">
        <div>
          <p className="font-medium text-[var(--color-ink)]">We&apos;re here to help you grow</p>
          <p className="mt-0.5 text-sm text-[var(--color-muted)]">Chat with your growth coach</p>
        </div>
        <Link
          href={withRestaurantQuery("/dashboard/chat", restaurantId)}
          className={`${appBtnPrimary} !min-h-10 !px-4 !py-2 text-sm no-underline`}
        >
          Start a chat
        </Link>
      </section>
    </div>
  );
}
