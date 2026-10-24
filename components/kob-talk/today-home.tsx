"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ApprovalCard } from "@/components/kob-talk/cards/approval-card";
import type { ActionView } from "@/lib/agent/access";
import type { ChiefOfStaffTaskDto, TodayBriefPayload } from "@/lib/chief-of-staff/types";
import type { HomeAudit } from "@/lib/kob/home/load-home";
import { displayImpact, pickBriefTasks } from "@/lib/kob/home/pick-brief-tasks";

type Outcome = { kind: "approved" | "skipped"; message: string; href?: string };

function checkedLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function TodayHome({
  restaurant,
  audit,
  initialBrief,
  onAsk,
}: {
  restaurant: { id: string; name: string };
  audit: HomeAudit | null;
  initialBrief: TodayBriefPayload | null;
  onAsk: (text: string) => void;
}) {
  const [brief, setBrief] = useState(initialBrief);
  const [loadError, setLoadError] = useState(false);
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [replies, setReplies] = useState<ActionView[]>([]);

  // Google connection: until it's connected, the first thing Today asks for is the listing (skippable).
  const [google, setGoogle] = useState<{ state: string; href: string | null } | null>(null);
  // The card only renders after the client fetch below, so reading storage here can't cause a hydration mismatch.
  const [googleSkipped, setGoogleSkipped] = useState(() => {
    try {
      return typeof window !== "undefined" && window.localStorage.getItem(`kob.skipGoogle.${restaurant.id}`) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/hub/connections/GBP?restaurantId=${encodeURIComponent(restaurant.id)}`, { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<{ state: string; connect: { kind: string; href?: string } }>) : null))
      .then((data) => {
        if (!cancelled && data) setGoogle({ state: data.state, href: data.connect.kind === "oauth" ? (data.connect.href ?? null) : null });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [restaurant.id]);
  // Trial banner: days left, or "ended — add a card" (KOB is read-only until then).
  const [billing, setBilling] = useState<{ state: string; daysLeft: number | null; price: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/billing/status?restaurantId=${encodeURIComponent(restaurant.id)}`, { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<{ state: string; daysLeft: number | null; price: string }>) : null))
      .then((data) => {
        if (!cancelled && data) setBilling(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [restaurant.id]);

  function skipGoogle() {
    setGoogleSkipped(true);
    try {
      window.localStorage.setItem(`kob.skipGoogle.${restaurant.id}`, "1");
    } catch {
      // fine: it just shows again next visit
    }
  }

  // Google changes (replies, hours, posts) go through the action ledger (approve → post → read back), not the
  // chief-of-staff task API.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/actions?restaurantId=${encodeURIComponent(restaurant.id)}&status=needs_you&limit=20`, { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<{ actions: ActionView[] }>) : { actions: [] }))
      .then((data) => {
        if (!cancelled) setReplies(data.actions.filter((a) => a.actionType.startsWith("gbp.")));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [restaurant.id]);

  useEffect(() => {
    if (brief) return;
    let cancelled = false;
    fetch(`/api/chief-of-staff/today?restaurantId=${encodeURIComponent(restaurant.id)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("brief");
        const data = (await res.json()) as TodayBriefPayload;
        if (!cancelled) setBrief(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [brief, restaurant.id]);

  // `brief` isn't mutated on approve/skip, so acted-on items stay put instead of jumping under the thumb.
  const shown = useMemo(
    () => (brief ? pickBriefTasks(replies.length ? brief.tasks.filter((t) => t.category !== "REVIEWS") : brief.tasks) : []),
    [brief, replies.length],
  );
  const repliesWaiting = replies.filter((a) => a.status === "AWAITING_APPROVAL").length;
  const remaining = shown.filter((t) => !outcomes[t.id]).length + repliesWaiting;
  const approvedToday = brief
    ? brief.tasks.filter((t) => t.status === "APPROVED").length +
      Object.values(outcomes).filter((o) => o.kind === "approved").length
    : 0;

  async function act(task: ChiefOfStaffTaskDto, kind: "approve" | "dismiss") {
    if (pending) return;
    setPending(task.id);
    setActionError(null);
    try {
      const res = await fetch(`/api/chief-of-staff/tasks/${encodeURIComponent(task.id)}/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: restaurant.id }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; nextHref?: string };
      if (!res.ok) {
        setActionError(data.message ?? "That didn't go through. Please try again.");
        return;
      }
      setOutcomes((cur) => ({
        ...cur,
        [task.id]:
          kind === "approve"
            ? { kind: "approved", message: data.message ?? "Approved.", href: data.nextHref }
            : { kind: "skipped", message: "Skipped for today." },
      }));
    } catch {
      setActionError("That didn't go through. Check your connection and try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <section aria-label="Today" className="space-y-5 py-2">
      <div>
        <p className="text-sm text-sage">{brief?.greeting ?? `Hello, ${restaurant.name}.`}</p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl">
          {!brief
            ? "Getting today ready…"
            : remaining > 0
              ? `${remaining} thing${remaining === 1 ? "" : "s"} for you today`
              : "You're done for today"}
        </h1>
      </div>

      {audit ? (
        <article className="rounded-3xl border border-line bg-paper p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="font-display text-5xl leading-none" aria-label={`Score ${audit.score} out of 100`}>
              {audit.score}
              <span className="text-lg text-muted">/100</span>
            </p>
            <Link href={audit.href} className="min-h-11 content-center text-sm underline">
              Full report
            </Link>
          </div>
          <p className="mt-3 text-sm font-medium">
            We checked {restaurant.name} on {checkedLabel(audit.checkedAt)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {audit.fixCount > 0
              ? `Your ${audit.fixCount} biggest fixes from that check are first in today's list.`
              : "Today's list starts from what that check found."}
          </p>
        </article>
      ) : (
        <article className="rounded-3xl border border-dashed border-line bg-paper p-5 text-sm">
          <p className="font-medium">See what guests see before they visit</p>
          <p className="mt-1 text-muted">
            Run the free check on your website and Google listing. Your fixes land here.
          </p>
          <Link
            href="/audit"
            className="mt-3 inline-flex min-h-11 items-center rounded-full bg-espresso px-4 text-paper"
          >
            Run the free check
          </Link>
        </article>
      )}

      {loadError && !brief ? (
        <p role="alert" className="rounded-2xl border border-line bg-paper p-4 text-sm">
          Couldn&apos;t load today&apos;s list.{" "}
          <button type="button" className="min-h-11 underline" onClick={() => window.location.reload()}>
            Try again
          </button>
        </p>
      ) : null}

      {!brief && !loadError ? (
        <ul aria-hidden className="space-y-3">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-24 animate-pulse rounded-2xl bg-paper" />
          ))}
        </ul>
      ) : null}

      {billing?.state === "trialing" && billing.daysLeft != null ? (
        <p className="text-sm text-muted">
          {billing.daysLeft} day{billing.daysLeft === 1 ? "" : "s"} left in your free trial ·{" "}
          <Link href={`/dashboard/billing?r=${encodeURIComponent(restaurant.id)}`} className="underline">
            Billing
          </Link>
        </p>
      ) : null}
      {billing?.state === "ended" ? (
        <article role="status" className="rounded-3xl border border-line bg-paper p-5 text-sm">
          <p className="font-medium">Your free trial has ended</p>
          <p className="mt-1 text-muted">
            KOB is paused: your data is kept, but nothing new is drafted or published. Add a card to keep it running — {billing.price} a
            month. Nothing has been charged.
          </p>
          <Link
            href={`/dashboard/billing?r=${encodeURIComponent(restaurant.id)}`}
            className="mt-3 inline-flex min-h-11 items-center rounded-full bg-espresso px-4 text-paper"
          >
            Add a card
          </Link>
        </article>
      ) : null}

      {google && google.state !== "connected" && !googleSkipped ? (
        <article className="rounded-3xl border border-line bg-paper p-5 text-sm">
          <p className="font-medium">
            {google.state === "reconnect"
              ? "Reconnect your Google listing"
              : google.state === "pick_location"
                ? "Pick your restaurant's Google listing"
                : "Connect your Google listing"}
          </p>
          <p className="mt-1 text-muted">
            KOB reads your reviews, hours, photos and posts every morning, drafts replies and fixes, and only changes
            Google after you approve — then checks it took.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {google.state === "pick_location" ? (
              <Link href="/app/settings/connections" className="inline-flex min-h-11 items-center rounded-full bg-espresso px-4 text-paper">
                Pick your listing
              </Link>
            ) : google.href ? (
              <a href={google.href} className="inline-flex min-h-11 items-center rounded-full bg-espresso px-4 text-paper">
                {google.state === "reconnect" ? "Reconnect Google" : "Connect Google"}
              </a>
            ) : (
              <span className="text-muted">Google connections open soon for your account.</span>
            )}
            <button type="button" className="min-h-11 underline" onClick={skipGoogle}>
              Skip for now
            </button>
          </div>
        </article>
      ) : null}

      {replies.length > 0 ? (
        <section aria-labelledby="today-replies" className="space-y-3">
          <h2 id="today-replies" className="text-sm font-medium">
            Waiting for your yes on Google
          </h2>
          <ul className="space-y-3">
            {replies.map((a) => (
              <li key={a.id}>
                <ApprovalCard
                  action={a}
                  detailHref={`/app/actions/${a.id}?r=${encodeURIComponent(restaurant.id)}`}
                  onSettled={(view) => setReplies((all) => all.map((x) => (x.id === view.id ? view : x)))}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {shown.length > 0 ? (
        <ol className="space-y-3">
          {shown.map((task, index) => {
            const outcome = outcomes[task.id];
            const impact = displayImpact(task.impactLabel);
            return (
              <li
                key={task.id}
                className={`rounded-2xl border border-line bg-paper p-4 ${outcome ? "opacity-70" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 font-display text-lg text-muted">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-medium">{task.title}</h2>
                    {task.detail ? <p className="mt-1 text-sm text-muted">{task.detail}</p> : null}
                    <p className="mt-2 text-xs text-muted">
                      About {task.estimatedMinutes} min{impact ? ` · ${impact}` : ""}
                    </p>
                    {outcome ? (
                      <p role="status" className="mt-3 text-sm">
                        {outcome.message}{" "}
                        {outcome.href ? (
                          <Link href={outcome.href} className="underline">
                            Open
                          </Link>
                        ) : null}
                      </p>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={Boolean(pending)}
                          onClick={() => void act(task, "approve")}
                          className="min-h-11 rounded-full bg-espresso px-5 text-sm text-paper disabled:opacity-50"
                        >
                          {pending === task.id ? "Saving…" : "Approve"}
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(pending)}
                          onClick={() => void act(task, "dismiss")}
                          className="min-h-11 rounded-full border border-line px-5 text-sm disabled:opacity-50"
                        >
                          Skip
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(pending)}
                          onClick={() => onAsk(`Help me with: ${task.title}`)}
                          className="min-h-11 px-2 text-sm underline disabled:opacity-50"
                        >
                          Ask KOB
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}

      {brief && remaining === 0 ? (
        <p className="rounded-2xl bg-paper p-4 text-sm text-muted">
          {approvedToday > 0
            ? `${approvedToday} approved today. Nothing goes live without you.`
            : "Nothing needs you right now."}{" "}
          Ask KOB anything below.
        </p>
      ) : null}

      {actionError ? (
        <p role="alert" className="rounded-2xl border border-line bg-paper p-4 text-sm">
          {actionError}
        </p>
      ) : null}
    </section>
  );
}
