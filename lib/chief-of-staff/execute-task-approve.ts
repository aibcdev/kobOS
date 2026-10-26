import type { ChiefOfStaffTask, TaskCategory } from "@prisma/client";
import { inngest } from "@/inngest/client";
import { draftReplyForReview } from "@/lib/agent/review-reply";
import { generateDraftsForTask } from "@/lib/chief-of-staff/generate-drafts-for-task";
import { prisma } from "@/lib/db/prisma";
import { findReview, starsMentioned } from "@/lib/kob/talk/restaurant-facts";

export type ApproveTaskResult =
  | {
      ok: true;
      task: ChiefOfStaffTask;
      message: string;
      nextHref?: string;
      contentId?: string;
      generating?: boolean;
      /** Set when approving produced an exact change waiting in Needs you (nothing is published until that's approved). */
      actionId?: string;
    }
  | { ok: false; status: number; code: string; message: string; nextHref?: string };

function categoryHref(category: TaskCategory, restaurantId: string): string {
  const r = encodeURIComponent(restaurantId);
  const map: Partial<Record<TaskCategory, string>> = {
    REVIEWS: `/dashboard/reviews?r=${r}`,
    SOCIAL: `/dashboard/content?r=${r}`,
    CONTENT: `/dashboard/content?r=${r}`,
    HOLIDAY: `/dashboard/content?r=${r}`,
    SEO: `/dashboard/website?r=${r}`,
    MENU: `/dashboard/brand?r=${r}`,
    COMPETITOR: `/dashboard/growth-agent?r=${r}`,
    OPERATIONS: `/dashboard/website?r=${r}`,
    EMAIL: `/dashboard/settings?r=${r}`,
  };
  return map[category] ?? `/dashboard?r=${r}`;
}

function needsDraftGeneration(task: ChiefOfStaffTask): boolean {
  if (task.draftPayload && typeof task.draftPayload === "object") {
    const p = task.draftPayload as Record<string, unknown>;
    if (p.body || p.contentId || p.reviewReplyContentId) return false;
  }
  return (
    task.category === "REVIEWS" ||
    ["HOLIDAY", "CONTENT", "SOCIAL", "EMAIL"].includes(task.category)
  );
}

/**
 * A "reply to this review" task: draft the exact reply for the synced review it's about and put it in Needs you.
 * Approving the task never posts; the owner approves the wording, then KOB posts it and reads it back from Google.
 * Returns null when the task doesn't match a synced review, so the general draft path handles it.
 */
async function approveReviewTask(task: ChiefOfStaffTask, userId: string | null): Promise<ApproveTaskResult | null> {
  const text = `${task.title} ${task.detail}`;
  const review = await findReview(task.restaurantId, { rating: starsMentioned(text), text });
  if (!review) return null;
  const draft = await draftReplyForReview(task.restaurantId, review, userId);
  if (draft.placed === "approval") {
    const updated = await prisma.chiefOfStaffTask.update({
      where: { id: task.id },
      data: { status: "APPROVED", draftPayload: { kind: "review_reply", body: draft.text, actionId: draft.actionId, contentId: draft.contentId } },
    });
    return {
      ok: true,
      task: updated,
      actionId: draft.actionId!,
      contentId: draft.contentId,
      message: draft.assisted
        ? "Your reply is ready. Check the wording, then tap Approve, copy & open Google and paste it in."
        : "Your reply is ready. Check the wording and approve it — KOB then posts it to Google and checks it's showing.",
      nextHref: `/app/actions/${draft.actionId}`,
    };
  }
  // Google isn't connected: the draft is saved for the owner to copy, and the task stays open.
  await prisma.chiefOfStaffTask.update({
    where: { id: task.id },
    data: { draftPayload: { kind: "review_reply", body: draft.text, contentId: draft.contentId } },
  });
  return {
    ok: false,
    status: 409,
    code: "connect_google",
    message: `Reply drafted, but not posted: ${draft.reason ?? "connect your Google listing first."}`,
    nextHref: `/app/settings?r=${encodeURIComponent(task.restaurantId)}`,
  };
}

export async function executeTaskApprove(task: ChiefOfStaffTask, userId: string | null = null): Promise<ApproveTaskResult> {
  if (task.requiresIntegration) {
    return {
      ok: false,
      status: 403,
      code: "integration_required",
      message: `Connect ${task.requiresIntegration} in Settings first.`,
      nextHref: `/dashboard/settings?r=${encodeURIComponent(task.restaurantId)}`,
    };
  }

  if (task.status === "APPROVED" || task.status === "DONE") {
    return {
      ok: true,
      task,
      message: "Already approved.",
      nextHref: categoryHref(task.category, task.restaurantId),
    };
  }

  if (task.category === "REVIEWS") {
    const review = await approveReviewTask(task, userId);
    if (review) return review;
  }

  const nextHref = categoryHref(task.category, task.restaurantId);
  const isSocialMulti = task.category === "SOCIAL" && /3|three/i.test(task.title);
  const willGenerate = needsDraftGeneration(task);

  // Mark approved immediately so the UI feels instant.
  const updated = await prisma.chiefOfStaffTask.update({
    where: { id: task.id },
    data: { status: "APPROVED" },
  });

  if (!willGenerate) {
    return {
      ok: true,
      task: updated,
      message: "Approved.",
      nextHref,
    };
  }

  // Generate drafts in the background when the job queue is up; say "being prepared" only when a job is queued.
  try {
    await inngest.send({
      name: "chief-of-staff/task.approved",
      data: { taskId: task.id, restaurantId: task.restaurantId },
    });
  } catch {
    // No job queue (e.g. local dev): draft now, and report what actually happened.
    const { contentIds } = await generateDraftsForTask(task.id).catch(() => ({ contentIds: [] as string[] }));
    if (!contentIds.length) {
      await prisma.chiefOfStaffTask.update({ where: { id: task.id }, data: { status: "PENDING" } });
      return {
        ok: false,
        status: 503,
        code: "draft_failed",
        message: "The draft couldn't be written just now. Nothing was posted. Please try again.",
      };
    }
    return {
      ok: true,
      task: updated,
      contentId: contentIds[0],
      message: contentIds.length > 1 ? "Approved — your drafts are ready in Content." : "Approved — your draft is ready in Content.",
      nextHref: `/dashboard/content?r=${encodeURIComponent(task.restaurantId)}`,
    };
  }

  return {
    ok: true,
    task: updated,
    generating: true,
    message: isSocialMulti
      ? "Approved — 3 drafts are being prepared. Check Content in a moment."
      : "Approved — your draft is being prepared. Check Content in a moment.",
    nextHref: `/dashboard/content?r=${encodeURIComponent(task.restaurantId)}`,
  };
}
