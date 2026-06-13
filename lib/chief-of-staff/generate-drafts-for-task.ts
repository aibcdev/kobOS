import { ContentType, type ChiefOfStaffTask, type Prisma } from "@prisma/client";
import { generateAndStoreContent } from "@/lib/ai/content";
import { prisma } from "@/lib/db/prisma";

function contentTypeForCategory(category: ChiefOfStaffTask["category"]): ContentType {
  if (category === "HOLIDAY") return ContentType.EMAIL_CAMPAIGN;
  if (category === "SOCIAL") return ContentType.INSTAGRAM_CAPTION;
  if (category === "EMAIL") return ContentType.EMAIL_CAMPAIGN;
  return ContentType.GOOGLE_BUSINESS_POST;
}

/** Generate content drafts for an approved task. Runs in background (Inngest) or sync fallback. */
export async function generateDraftsForTask(taskId: string): Promise<{ contentIds: string[] }> {
  const task = await prisma.chiefOfStaffTask.findUnique({ where: { id: taskId } });
  if (!task || task.status !== "APPROVED") return { contentIds: [] };

  let draftPayload = (task.draftPayload as Record<string, unknown> | null) ?? {};
  const contentIds: string[] = [];

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
        withImage: false,
      });
      if (!("error" in gen)) {
        contentIds.push(gen.id);
        draftPayload = { ...draftPayload, reviewReplyContentId: gen.id, preview: gen.output.slice(0, 500) };
      }
    }
  } else if (["HOLIDAY", "CONTENT", "SOCIAL", "EMAIL"].includes(task.category)) {
    const isSocialMulti = task.category === "SOCIAL" && /3|three/i.test(task.title);
    const count = isSocialMulti ? 3 : 1;

    const gens = await Promise.all(
      Array.from({ length: count }, (_, i) => {
        const suffix = count > 1 ? ` (post ${i + 1} of ${count})` : "";
        return generateAndStoreContent({
          restaurantId: task.restaurantId,
          type: contentTypeForCategory(task.category),
          extraPrompt: `${task.title}${suffix}. ${task.detail}`,
          withImage: false,
        });
      }),
    );

    for (const gen of gens) {
      if (!("error" in gen)) contentIds.push(gen.id);
    }
    const lastOk = gens.find((g) => !("error" in g));
    if (lastOk && !("error" in lastOk)) {
      draftPayload = { ...draftPayload, contentId: lastOk.id, preview: lastOk.output.slice(0, 500) };
    }
  }

  if (contentIds.length > 0 || Object.keys(draftPayload).length > 0) {
    await prisma.chiefOfStaffTask.update({
      where: { id: taskId },
      data: { draftPayload: draftPayload as Prisma.InputJsonValue },
    });
  }

  return { contentIds };
}
