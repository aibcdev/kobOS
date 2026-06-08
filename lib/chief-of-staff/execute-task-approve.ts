import { ContentType, type ChiefOfStaffTask, type TaskCategory, type Prisma } from "@prisma/client";
import { generateAndStoreContent } from "@/lib/ai/content";
import { prisma } from "@/lib/db/prisma";

export type ApproveTaskResult =
  | { ok: true; task: ChiefOfStaffTask; message: string; nextHref?: string; contentId?: string }
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

function contentTypeForCategory(category: TaskCategory): ContentType {
  if (category === "HOLIDAY") return ContentType.EMAIL_CAMPAIGN;
  if (category === "SOCIAL") return ContentType.INSTAGRAM_CAPTION;
  if (category === "EMAIL") return ContentType.EMAIL_CAMPAIGN;
  return ContentType.GOOGLE_BUSINESS_POST;
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

  let draftPayload = task.draftPayload as Record<string, unknown> | null;
  let contentId: string | undefined;

  if (task.category === "REVIEWS") {
    const review = await prisma.customerReview.findFirst({
      where: { restaurantId: task.restaurantId, replied: false },
      orderBy: { reviewedAt: "desc" },
    });
    if (review) {
      const gen = await generateAndStoreContent({
        restaurantId: task.restaurantId,
        type: ContentType.GROWTH_REVIEW_REPLY,
        extraPrompt: `Review: "${review.body.slice(0, 400)}" (${review.rating} stars). Task: ${task.title}`,
      });
      if (!("error" in gen)) {
        contentId = gen.id;
        draftPayload = { ...draftPayload, reviewReplyContentId: gen.id, preview: gen.output.slice(0, 500) };
      }
    }
  } else if (["HOLIDAY", "CONTENT", "SOCIAL", "EMAIL"].includes(task.category)) {
    const gen = await generateAndStoreContent({
      restaurantId: task.restaurantId,
      type: contentTypeForCategory(task.category),
      extraPrompt: `${task.title}. ${task.detail}`,
    });
    if ("error" in gen) {
      if (gen.error.includes("OPENAI")) {
        return {
          ok: false,
          status: 503,
          code: "ai_unavailable",
          message: "AI drafting is temporarily unavailable. Try again shortly.",
        };
      }
    } else {
      contentId = gen.id;
      draftPayload = { ...draftPayload, contentId: gen.id, preview: gen.output.slice(0, 500) };
    }
  }

  const updated = await prisma.chiefOfStaffTask.update({
    where: { id: task.id },
    data: {
      status: "APPROVED",
      draftPayload: draftPayload ? (draftPayload as Prisma.InputJsonValue) : undefined,
    },
  });

  const nextHref = contentId
    ? `/dashboard/content?r=${encodeURIComponent(task.restaurantId)}`
    : categoryHref(task.category, task.restaurantId);

  return {
    ok: true,
    task: updated,
    message: contentId ? "Draft created — view it in Content." : "Approved — open the next tab to continue.",
    nextHref,
    contentId,
  };
}
