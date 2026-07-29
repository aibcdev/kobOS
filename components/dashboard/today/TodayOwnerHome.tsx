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

const cardClass =
  "rounded-2xl border border-[var(--color-hairline)] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]";
const eyebrowClass =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-medium)]";

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

  const surfaceHref = ctaHrefForOperatorTask(task, restaurantId, withRestaurantQuery);

  return (
    <li className="flex flex-wrap items-center gap-3 border-t border-[var(--color-hairline)] py-4 first:border-t-0 first:pt-0 last:pb-0 sm:gap-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-xs font-semibold text-[var(--color-primary)]">
        {index}
      </span>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-warm)] text-[var(--color-muted)]">
        <DashboardNavIconGlyph icon={iconForTask(task)} />
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
          +{task.customersDelta}
          <span className="ml-1 font-normal text-[var(--color-muted-medium)]">/ month</span>
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
      <Link
        href={surfaceHref}
        aria-label={`Open ${task.title}`}
        className="shrink-0 text-[var(--color-muted-medium)] no-underline hover:text-[var(--color-ink)]"
      >
        ›
      </Link>
    </li>
  );
}

function DoneThisWeek({ done }: { done: { id: string; title: string }[] }) {
  if (done.length === 0) return null;
  return (
    <section className={`${cardClass} px-5 py-4 sm:px-6`}>
      <p className={eyebrowClass}>Delivered this week</p>
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

function ProgressStat({
  icon,
  children,
}: {
  icon: DashboardNavIcon;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-2.5">
      <span className="shrink-0 text-[var(--color-muted-medium)]">
        <DashboardNavIconGlyph icon={icon} className="h-4 w-4" />
      </span>
      <span>{children}</span>
    </li>
  );
}

function HolidayChecklistRow({
  label,
  href,
  cta,
  done,
}: {
  label: string;
  href: string;
  cta: string;
  done: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
            done
              ? "bg-[var(--color-primary)] text-white"
              : "border border-[var(--color-hairline)] text-transparent"
          }`}
        >
          ✓
        </span>
        <span className="min-w-0 truncate text-[var(--color-ink)]">{label}</span>
      </span>
      <Link
        href={href}
        className="shrink-0 rounded-lg bg-[var(--color-surface-warm)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] no-underline hover:bg-[var(--color-muted-faint)]"
      >
        {cta}
      </Link>
    </li>
  );
}

/** Suggestions arrive as plain sentences — route them to the surface that resolves them. */
function suggestionTarget(suggestion: string, restaurantId: string) {
  const s = suggestion.toLowerCase();
  if (s.includes("review")) {
    return {
      cta: "See reviews",
      href: withRestaurantQuery("/dashboard/reviews", restaurantId),
      detail: "Show customers you care and build trust.",
    };
  }
  if (s.includes("photo") || s.includes("image")) {
    return {
      cta: "Update photos",
      href: withRestaurantQuery("/dashboard/listings", restaurantId),
      detail: "Fresh photos help guests pick you over nearby places.",
    };
  }
  if (s.includes("post") || s.includes("social") || s.includes("instagram")) {
    return {
      cta: "Open social",
      href: withRestaurantQuery("/dashboard/content", restaurantId),
      detail: "Stay visible between visits so guests remember you.",
    };
  }
  if (s.includes("offer") || s.includes("quiet") || s.includes("demand")) {
    return {
      cta: "Open Demand",
      href: withRestaurantQuery("/dashboard/demand-engine", restaurantId),
      detail: "Fill your softest hours without discounting everything.",
    };
  }
  return {
    cta: "Ask our team",
    href: withRestaurantQuery("/dashboard/requests", restaurantId),
    detail: "We can take this on for you — request it and we deliver.",
  };
}

function TeamAvatars() {
  return (
    <span aria-hidden className="flex shrink-0 -space-x-2">
      {["A", "M", "J"].map((initial, i) => (
        <span
          key={initial}
          className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[11px] font-semibold text-white ${
            i === 0
              ? "bg-[var(--color-primary)]"
              : i === 1
                ? "bg-[var(--color-forest-mid)]"
                : "bg-[var(--color-ink)]"
          }`}
        >
          {initial}
        </span>
      ))}
    </span>
  );
}

export function TodayOwnerHome({
  restaurantId,
  restaurantName,
  city,
  cuisineType,
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
  /** When true, load priorities in the background so login never waits on Gemini. */
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
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const refreshBrief = useCallback(async () => {
    if (previewMode) return;
    setRefreshing(true);
    setRefreshError(null);
    try {
      const res = await fetch("/api/chief-of-staff/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId }),
        signal: AbortSignal.timeout(25_000),
      });
      if (!res.ok) {
        setRefreshError("Could not refresh AI brief — showing audit priorities.");
        return;
      }
      const next = (await res.json()) as TodayBriefPayload;
      // Never wipe audit-backed priorities with an empty AI response.
      if (next.tasks?.length) {
        setBrief(next);
      } else if (next.summary) {
        setBrief((prev) => ({
          ...prev,
          summary: {
            ...prev.summary,
            ...next.summary,
            // Keep holiday/tasks if AI omitted them
            holidayBlock: next.summary.holidayBlock ?? prev.summary.holidayBlock,
            taskCount: Math.max(next.summary.taskCount, prev.summary.taskCount),
          },
          greeting: next.greeting || prev.greeting,
        }));
      }
    } catch {
      setRefreshError("Brief refresh timed out — your audit priorities stay below.");
    } finally {
      setRefreshing(false);
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
    // Audit/journey fixes first (the hardline Today experience), then demand.
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

  // Only system/ops-delivered work belongs here — never owner clicks.
  const doneTasks = useMemo(
    () =>
      openRequests
        .filter((r) => r.status === "DELIVERED")
        .slice(0, 5)
        .map((r) => ({ id: r.id, title: r.title })),
    [openRequests],
  );

  const completed = useMemo(
    () => brief.tasks.filter((t) => t.status === "APPROVED" || t.status === "DONE"),
    [brief.tasks],
  );
  const minutesSaved = completed.reduce((s, t) => s + (t.estimatedMinutes ?? 0), 0);

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

  const progressMessage =
    overall == null
      ? "Your first snapshot is still running."
      : overall >= 70
        ? "Great progress! Keep it up."
        : overall >= 40
          ? "Good start — the big wins are still open."
          : "Plenty to win back — start with priority one.";

  const siteUrl = journey?.websiteUrl ?? website;
  const needToKnow: { key: string; node: React.ReactNode }[] = [];
  if (holiday) {
    needToKnow.push({
      key: "event",
      node: `Next UK event: ${holiday.eventName} in ${holiday.daysAway} days.`,
    });
  }
  if (overall != null) {
    needToKnow.push({
      key: "overall",
      node: (
        <>
          Linked audit overall score:{" "}
          <span className="font-semibold tabular-nums text-[var(--color-ink)]">{overall}/100</span>
        </>
      ),
    });
  }
  if (journey?.designScore != null) {
    needToKnow.push({
      key: "design",
      node: (
        <>
          Linked audit design score:{" "}
          <span className="font-semibold tabular-nums text-[var(--color-ink)]">
            {journey.designScore}/100
          </span>
        </>
      ),
    });
  }
  if (siteUrl) {
    needToKnow.push({
      key: "site",
      node: (
        <>
          Website:{" "}
          <a
            href={siteUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[var(--color-primary)] underline-offset-2"
          >
            {siteUrl.replace(/^https?:\/\//, "")}
          </a>
        </>
      ),
    });
  }
  for (const line of brief.summary.needToKnow) {
    if (needToKnow.length >= 4) break;
    // The event and the site already have their own rows above.
    if (holiday && line.toLowerCase().includes(holiday.eventName.toLowerCase())) continue;
    if (siteUrl && line.includes(siteUrl)) continue;
    needToKnow.push({ key: line, node: line });
  }
  if (needToKnow.length === 0) {
    needToKnow.push({ key: "health", node: brief.summary.revenueHealthLine });
  }

  const suggestionText = brief.summary.suggestions[0] ?? null;
  const suggestion = suggestionText
    ? { text: suggestionText, ...suggestionTarget(suggestionText, restaurantId) }
    : openTasks[0]
      ? {
          text: openTasks[0].title,
          detail: openTasks[0].why,
          cta: "Open priorities",
          href: withRestaurantQuery("/dashboard/requests", restaurantId),
        }
      : null;

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
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {greet}! <span aria-hidden>👋</span>
          </p>
          {city || cuisineType ? (
            <p className="mt-0.5 text-xs text-[var(--color-muted-medium)]">
              {[restaurantName, city, cuisineType].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {fullReportHref.startsWith("/audit") ? (
            <Link
              href={fullReportHref}
              className={`${appBtnSecondary} !min-h-10 !px-4 !py-2 text-sm no-underline`}
            >
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
          <section className={`${cardClass} p-5 sm:p-6`}>
            <p className={eyebrowClass}>Top priorities for you</p>
            <h2 className="mt-2 font-head text-xl font-semibold leading-snug text-[var(--color-ink)] sm:text-2xl">
              You could get{" "}
              <span className="text-[var(--color-primary)]">+{headlineCustomers} more customers</span>{" "}
              every month
            </h2>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
              <p className="max-w-md text-sm text-[var(--color-muted)]">
                {openTasks.length > 0
                  ? `Fix ${openTasks.length === 1 ? "this" : `these ${openTasks.length}`} high-impact ${
                      openTasks.length === 1 ? "issue" : "issues"
                    } to start winning back lost customers.`
                  : "Priorities appear once your journey snapshot finishes."}
                {customersLow > 0 && customersHigh > 0 ? (
                  <>
                    {" "}
                    Est. ~{customersLow}–{customersHigh} fewer guests / month than you could be getting.
                  </>
                ) : null}
              </p>
              {openTasks.length > 0 ? (
                <p className="text-xs text-[var(--color-muted-medium)]">
                  Estimated additional customers / month
                </p>
              ) : null}
            </div>
            <ol className="mt-5">
              {openTasks.length === 0 ? (
                <li className="py-3 text-sm text-[var(--color-muted)]">
                  Nothing needs you right now — we&apos;ll surface the next fix as soon as we spot it.
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
            <p className="mt-4 border-t border-[var(--color-hairline)] pt-3 text-xs text-[var(--color-muted-medium)]">
              Tap a green button to request help — it stays Requested until our team delivers. Nothing is
              marked done just because you clicked.
            </p>
          </section>

          <DoneThisWeek done={doneTasks} />

          <section className={`${cardClass} overflow-hidden`}>
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 sm:px-6">
              <div>
                <p className="font-head text-lg font-semibold text-[var(--color-ink)]">{greet}.</p>
                <p className="mt-1 max-w-xl text-sm text-[var(--color-muted)]">
                  {brief.summary.revenueHealthLine}
                </p>
                <p className="mt-1.5 text-sm text-[var(--color-muted)]">
                  You have{" "}
                  <strong className="font-semibold text-[var(--color-ink)]">
                    {brief.summary.taskCount}
                  </strong>{" "}
                  high-impact tasks today.
                  {brief.summary.totalMinutes > 0 ? (
                    <>
                      {" "}
                      Estimated completion time:{" "}
                      <strong className="font-semibold text-[var(--color-ink)]">
                        {brief.summary.totalMinutes} minutes
                      </strong>
                      .
                    </>
                  ) : null}
                </p>
                {refreshError ? <p className="mt-1 text-xs text-red-700">{refreshError}</p> : null}
              </div>
              <button
                type="button"
                disabled={refreshing || previewMode}
                onClick={() => void refreshBrief()}
                className={`${appBtnSecondary} !min-h-9 shrink-0 !rounded-xl !px-3 !py-1.5 text-xs disabled:opacity-50`}
              >
                {refreshing
                  ? brief.tasks.length > 0
                    ? "Updating…"
                    : "Refreshing…"
                  : "Refresh brief"}
              </button>
            </div>

            {holiday ? (
              <div className="grid border-t border-[var(--color-hairline)] sm:grid-cols-2">
                <div className="bg-[var(--color-primary)] px-5 py-6 text-white sm:px-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
                    Holiday engine
                  </p>
                  <p className="mt-3 font-head text-xl font-semibold">
                    {holiday.eventName} is {holiday.daysAway} days away
                  </p>
                  <p className="mt-2 text-sm text-white/80">
                    Drafts are ready to approve — nothing goes live without you.
                  </p>
                  <Link
                    href={withRestaurantQuery("/dashboard/creative", restaurantId)}
                    className="mt-5 inline-flex min-h-10 items-center rounded-xl border border-white/40 px-4 text-sm font-semibold text-white no-underline hover:bg-white/10"
                  >
                    Plan your campaign
                  </Link>
                </div>
                <div className="px-5 py-6 sm:px-6">
                  <p className="text-sm font-medium text-[var(--color-ink)]">
                    Get ahead &amp; capture more bookings
                  </p>
                  <ul className="mt-3 space-y-3 text-sm">
                    <HolidayChecklistRow
                      label={holiday.emailPrepared ? "Email draft ready" : "Email draft on approve"}
                      href={withRestaurantQuery("/dashboard/creative", restaurantId)}
                      cta="Review"
                      done={holiday.emailPrepared}
                    />
                    <HolidayChecklistRow
                      label={
                        holiday.instagramPrepared ? "Social post ideas ready" : "Social posts on approve"
                      }
                      href={withRestaurantQuery("/dashboard/content", restaurantId)}
                      cta="View"
                      done={holiday.instagramPrepared}
                    />
                    <HolidayChecklistRow
                      label="Special menu idea"
                      href={withRestaurantQuery("/dashboard/menu", restaurantId)}
                      cta="View"
                      done={holiday.bannerPrepared}
                    />
                    <HolidayChecklistRow
                      label="Paid ad audience"
                      href={withRestaurantQuery("/dashboard/demand-engine", restaurantId)}
                      cta="View"
                      done={false}
                    />
                  </ul>
                  <Link
                    href={withRestaurantQuery("/dashboard/creative", restaurantId)}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)] no-underline"
                  >
                    See full holiday planner <span aria-hidden>›</span>
                  </Link>
                </div>
              </div>
            ) : null}
          </section>
        </div>

        <aside className="flex flex-col gap-5 lg:col-span-4">
          <section className={`${cardClass} p-5 text-center sm:p-6`}>
            <p className={eyebrowClass}>Your progress</p>
            <div className="mt-4">
              <ProgressRing score={overall ?? 0} />
            </div>
            <p className="mt-3 text-sm text-[var(--color-muted)]">{progressMessage}</p>
            <ul className="mt-4 space-y-2.5 text-left text-sm text-[var(--color-muted)]">
              <ProgressStat icon="reviews">
                <span className="font-medium tabular-nums text-[var(--color-ink)]">
                  {completed.length}
                </span>{" "}
                {completed.length === 1 ? "task" : "tasks"} completed
              </ProgressStat>
              <ProgressStat icon="analytics">
                <span className="font-medium tabular-nums text-[var(--color-ink)]">{minutesSaved}</span>{" "}
                minutes saved
              </ProgressStat>
              <ProgressStat icon="customers">
                {requestedCount > 0
                  ? `${requestedCount} with our team right now`
                  : doneTasks.length > 0
                    ? "Customers can see improvements"
                    : "Request a fix and we take it from there"}
              </ProgressStat>
            </ul>
            <Link
              href={fullReportHref}
              className={`${appBtnSecondary} mt-5 !min-h-10 w-full !px-4 !py-2 text-sm no-underline`}
            >
              View full report
            </Link>
          </section>

          <section className={`${cardClass} p-5 sm:p-6`}>
            <p className={eyebrowClass}>Need to know</p>
            <ul className="mt-3 space-y-2.5 text-sm text-[var(--color-muted)]">
              {needToKnow.map((line) => (
                <li key={line.key}>{line.node}</li>
              ))}
            </ul>
          </section>

          <section className={`${cardClass} p-5 sm:p-6`}>
            <p className={eyebrowClass}>Suggestions for you</p>
            {suggestion ? (
              <>
                <p className="mt-3 text-sm font-medium text-[var(--color-ink)]">{suggestion.text}</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{suggestion.detail}</p>
                <Link
                  href={suggestion.href}
                  className={`${appBtnSecondary} mt-4 !min-h-10 w-full !px-4 !py-2 text-sm no-underline`}
                >
                  {suggestion.cta}
                </Link>
              </>
            ) : (
              <p className="mt-3 text-sm text-[var(--color-muted)]">
                Check Demand for quiet-period offers.
              </p>
            )}
          </section>
        </aside>
      </div>

      <section className={`${cardClass} mt-6 flex flex-wrap items-center gap-4 px-5 py-4 sm:px-6`}>
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-warm)] text-[var(--color-primary)]"
        >
          ♥
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[var(--color-ink)]">We&apos;re here to help you grow</p>
          <p className="mt-0.5 text-sm text-[var(--color-muted)]">
            Have a question or need help prioritising?
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TeamAvatars />
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-[var(--color-ink)]">Chat with your growth coach</p>
            <p className="text-xs text-[var(--color-muted)]">Real people. Real answers.</p>
          </div>
        </div>
        <Link
          href={withRestaurantQuery("/dashboard/chat", restaurantId)}
          className={`${appBtnPrimary} !min-h-10 shrink-0 !px-4 !py-2 text-sm no-underline`}
        >
          Start a chat
        </Link>
      </section>
    </div>
  );
}
