"use client";

import {
  buildDecisionJourneyReport,
  type JourneyStage,
  type JourneyStatus,
} from "@/lib/audit/decision-journey";
import type { AuditResultPayload } from "@/lib/audit/types";

function statusDot(status: JourneyStatus | null): { label: string; className: string } {
  if (status === "Strong") return { label: "Strong", className: "bg-emerald-500" };
  if (status === "Acceptable") return { label: "OK", className: "bg-emerald-400" };
  if (status === "Leaking") return { label: "Leaking", className: "bg-amber-500" };
  if (status === "Broken") return { label: "Broken", className: "bg-red-500" };
  return { label: "Decision", className: "bg-[#2c2c2c]/35" };
}

function StageRow({ stage, isLast }: { stage: JourneyStage; isLast: boolean }) {
  const dot = statusDot(stage.status);
  return (
    <li className="relative flex gap-4 pb-5 last:pb-0">
      {!isLast ? (
        <span
          className="absolute top-5 left-[0.55rem] h-[calc(100%-0.5rem)] w-px bg-[#2c2c2c]/12"
          aria-hidden
        />
      ) : null}
      <span
        className={`relative z-[1] mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dot.className}`}
        title={dot.label}
        aria-label={dot.label}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-[#1a1a1a]">
            {stage.id === "outcome" ? "Decides whether to visit" : stage.customerAction}
          </p>
          {stage.score != null ? (
            <p className="text-xs font-semibold tabular-nums text-[#2c2c2c]/55">{stage.score}/100</p>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-[#2c2c2c]/50">{stage.experience}</p>
      </div>
    </li>
  );
}

/**
 * Signature concept: Customer Decision Journey™ — one memorable visual of where guests drop off.
 */
export function CustomerDecisionJourney({
  payload,
  restaurantName,
  city,
  websiteUrl,
}: {
  payload: AuditResultPayload;
  restaurantName: string;
  city: string;
  websiteUrl?: string | null;
}) {
  const journey = buildDecisionJourneyReport(payload, {
    restaurantName,
    city,
    websiteUrl,
  });
  const weakest = journey.dropOffs[0];

  return (
    <div className="mb-8 rounded-3xl border border-[#2c2c2c]/10 bg-white p-6 md:p-8">
      <p className="font-mono-brand text-xs font-semibold tracking-wider text-[var(--color-forest-mid)] uppercase">
        Customer Decision Journey
      </p>
      <h2 className="font-heading mt-1 text-xl tracking-tight text-[#1a1a1a] md:text-2xl">
        Where guests decide before they visit
      </h2>
      <p className="mt-2 text-sm text-[#2c2c2c]/60">{journey.opening}</p>

      <ol className="mt-6">
        {journey.stages.map((stage, i) => (
          <StageRow key={stage.id} stage={stage} isLast={i === journey.stages.length - 1} />
        ))}
      </ol>

      {weakest ? (
        <div className="mt-2 rounded-2xl bg-red-50 px-4 py-3">
          <p className="text-xs font-medium tracking-wide text-red-800/70 uppercase">
            Most customers are dropping off at
          </p>
          <p className="mt-1 text-lg font-semibold text-red-900">{weakest.stageLabel}</p>
          <p className="mt-1 text-sm text-red-900/75">{weakest.body}</p>
        </div>
      ) : null}
    </div>
  );
}
