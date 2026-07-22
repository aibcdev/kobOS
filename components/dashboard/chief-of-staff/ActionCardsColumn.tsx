"use client";

import type { TodayBriefSummary } from "@/lib/chief-of-staff/types";
import { cosCard, cosHeroTitle, cosBodyMuted } from "@/lib/dashboard/chief-of-staff-theme";

export function ActionCardsColumn({
  greeting,
  summary,
  onApproveHoliday,
  onApproveTopFix,
  holidayBusy,
  creativeHref,
  requestsHref,
}: {
  greeting: string;
  summary: TodayBriefSummary;
  onApproveHoliday: () => void;
  onApproveTopFix?: () => void;
  holidayBusy?: boolean;
  creativeHref?: string;
  requestsHref?: string;
}) {
  const opp =
    summary.revenueOpportunityLow != null && summary.revenueOpportunityHigh != null
      ? `£${summary.revenueOpportunityLow}–£${summary.revenueOpportunityHigh}`
      : null;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className={cosHeroTitle}>{greeting}</h1>
        <p className={`mt-3 ${cosBodyMuted}`}>{summary.revenueHealthLine}</p>
        <p className="mt-2 text-sm text-[#444]">
          You have <strong>{summary.taskCount}</strong> high-impact tasks today.
          {summary.totalMinutes > 0 ? (
            <>
              {" "}
              Estimated completion time: <strong>{summary.totalMinutes} minutes</strong>.
            </>
          ) : null}
        </p>
        {opp ? (
          <p className="mt-2 text-sm font-medium text-[var(--color-primary)]">
            Potential revenue opportunity: {opp}/month
          </p>
        ) : null}
      </header>

      {summary.revenueOpportunityLow != null ? (
        <div className={`${cosCard} p-6`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#888]">From your scan</p>
          <p className="mt-2 text-lg font-semibold text-[#1a1a1a]">
            {summary.revenueHeadline ?? "Guests may notice gaps before they book"}
          </p>
          <p className="mt-2 text-sm text-[#666]">
            Your free scan flagged what looks off online. Approve tasks in the list—we prepare drafts for you to review.
          </p>
          {opp ? <p className="mt-3 text-2xl font-semibold tabular-nums text-[#ea580c]">{opp}/mo</p> : null}
          {onApproveTopFix ? (
            <button
              type="button"
              onClick={onApproveTopFix}
              className="mt-4 rounded-full border border-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)]"
            >
              Review top fix
            </button>
          ) : null}
        </div>
      ) : null}

      {summary.holidayBlock ? (
        <div className={`${cosCard} p-6`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#888]">Holiday engine</p>
          <p className="mt-2 text-lg font-semibold text-[#1a1a1a]">
            {summary.holidayBlock.eventName} is {summary.holidayBlock.daysAway} days away
          </p>
          <ul className="mt-4 space-y-2 text-sm text-[#555]">
            <li>{summary.holidayBlock.emailPrepared ? "Email draft ready after approve" : "Email draft on approve"}</li>
            <li>{summary.holidayBlock.instagramPrepared ? "Social draft ready after approve" : "Social draft on approve"}</li>
          </ul>
          <button
            type="button"
            disabled={holidayBusy}
            onClick={onApproveHoliday}
            className="mt-5 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            Approve all
          </button>
        </div>
      ) : null}

      <div className={`${cosCard} p-6`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#888]">Quick actions</p>
        <p className="mt-2 text-lg font-semibold text-[#1a1a1a]">Request website, logo, or SEO</p>
        <p className="mt-2 text-sm text-[#666]">
          Spend plan credits — our team delivers the work after you&apos;re on a paid plan. Nothing is
          auto-built.
        </p>
        {requestsHref ? (
          <a
            href={requestsHref}
            className="mt-5 inline-flex rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Open requests
          </a>
        ) : null}
      </div>
    </div>
  );
}
