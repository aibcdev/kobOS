"use client";

import Link from "next/link";
import type { ChiefOfStaffTaskDto } from "@/lib/chief-of-staff/types";

const KIND_LABELS: Record<string, string> = {
  email: "Email draft",
  social_post: "Social post draft",
  review_reply: "Review reply draft",
  content: "Content draft",
  note: "Prepared notes",
};

export function ReviewDrawer({
  task,
  restaurantId,
  busy,
  onApprove,
  onDismiss,
  onClose,
}: {
  task: ChiefOfStaffTaskDto;
  restaurantId: string;
  busy?: boolean;
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
  onClose: () => void;
}) {
  const done = task.status === "APPROVED" || task.status === "DONE";
  const chatHref = task.conversationId
    ? `/dashboard/chat?r=${encodeURIComponent(restaurantId)}&c=${encodeURIComponent(task.conversationId)}`
    : `/dashboard/chat?r=${encodeURIComponent(restaurantId)}`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Review draft">
      <button type="button" className="absolute inset-0 bg-black/30" onClick={onClose} aria-label="Close" />
      <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[#eee] p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#888]">
              {task.draft ? KIND_LABELS[task.draft.kind] ?? "Draft" : "Task"}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[#1a1a1a]">{task.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f0f0f0] text-[#555]"
            aria-label="Close drawer"
          >
            ×
          </button>
        </div>

        <div className="flex-1 p-5">
          {task.detail ? <p className="text-sm leading-relaxed text-[#666]">{task.detail}</p> : null}

          {task.draft ? (
            <div className="mt-4 rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-4">
              {task.draft.subject ? (
                <p className="border-b border-[#eee] pb-2 text-sm font-semibold text-[#1a1a1a]">
                  {task.draft.subject}
                </p>
              ) : null}
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#333]">{task.draft.body}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[#888]">
              No draft yet — approving prepares one for you to review on the Content page.
            </p>
          )}

          <p className="mt-4 text-[11px] text-[#aaa]">Nothing posts or sends without your approval.</p>
        </div>

        <div className="border-t border-[#eee] p-5">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={done || busy}
              onClick={() => onApprove(task.id)}
              className="rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {done ? "Approved" : busy ? "Approving…" : "Approve"}
            </button>
            <Link
              href={chatHref}
              className="rounded-full border border-[#ddd] px-5 py-3 text-center text-sm font-medium text-[#444] no-underline hover:bg-[#fafafa]"
            >
              Ask to change
            </Link>
            {!done ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onDismiss(task.id)}
                className="rounded-full px-5 py-2 text-sm text-[#999] hover:text-[#555]"
              >
                Dismiss task
              </button>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}
