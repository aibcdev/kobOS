"use client";

import Link from "next/link";
import type { ChiefOfStaffTaskDto } from "@/lib/chief-of-staff/types";

function sourceLabel(source: ChiefOfStaffTaskDto["source"], requiresIntegration: string | null) {
  if (requiresIntegration) return "Connect in Settings";
  if (source === "AUDIT") return "From your audit";
  if (source === "AI") return "AI suggestion";
  return "Suggested";
}

export function TaskRow({
  task,
  onApprove,
  busy,
}: {
  task: ChiefOfStaffTaskDto;
  onApprove: (id: string) => void;
  busy?: boolean;
}) {
  const done = task.status === "APPROVED" || task.status === "DONE";

  return (
    <article className="flex gap-3 border-b border-[#eee] py-4 last:border-0">
      <button
        type="button"
        disabled={done || busy}
        onClick={() => onApprove(task.id)}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          done ? "border-[var(--color-primary)] bg-[var(--color-primary)]" : "border-[#ccc] bg-white hover:border-[var(--color-primary)]"
        }`}
        aria-label={done ? "Approved" : "Approve task"}
      >
        {done ? (
          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : null}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${done ? "text-[#999] line-through" : "text-[#1a1a1a]"}`}>{task.title}</p>
        {task.detail ? <p className="mt-1 text-xs leading-relaxed text-[#777]">{task.detail}</p> : null}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#888]">
          {task.impactLabel ? <span>{task.impactLabel}</span> : null}
          <span>·</span>
          <span>{task.estimatedMinutes} min</span>
          <span>·</span>
          <span>{task.confidenceScore}% confidence</span>
          <span className="rounded-full bg-[#f0f0f0] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#666]">
            {sourceLabel(task.source, task.requiresIntegration)}
          </span>
        </div>
        {!done && !task.requiresIntegration ? (
          <p className="mt-2 text-[10px] text-[#aaa]">Approve prepares a draft for you to review—nothing posts automatically.</p>
        ) : null}
        {task.requiresIntegration ? (
          <Link href="/dashboard/settings" className="mt-2 inline-block text-[11px] font-medium text-[var(--color-primary)] underline">
            Connect in Settings →
          </Link>
        ) : null}
      </div>
    </article>
  );
}
