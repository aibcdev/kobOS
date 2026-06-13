import type { ChiefOfStaffTask, TaskCategory } from "@prisma/client";
import { inngest } from "@/inngest/client";
import { generateDraftsForTask } from "@/lib/chief-of-staff/generate-drafts-for-task";
import { prisma } from "@/lib/db/prisma";

export type ApproveTaskResult =
  | { ok: true; task: ChiefOfStaffTask; message: string; nextHref?: string; contentId?: string; generating?: boolean }
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

export async function executeTaskApprove(task: ChiefOfStaffTask): Promise<ApproveTaskResult> {
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

  // Generate drafts in background — don't block the button click.
  try {
    await inngest.send({
      name: "chief-of-staff/task.approved",
      data: { taskId: task.id, restaurantId: task.restaurantId },
    });
  } catch {
    // Inngest unavailable (local dev) — generate inline without blocking HTTP... 
    // Fire-and-forget; user already sees approved state.
    void generateDraftsForTask(task.id).catch(() => {});
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
