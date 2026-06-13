import type { TaskCategory } from "@prisma/client";
import { z } from "zod";
import { openaiJsonCompletion } from "@/lib/growth-agent/openai-json-completion";
import { buildGrowthAgentBriefingContext } from "@/lib/growth-agent/restaurant-context";
import type { ChiefOfStaffTaskDto, TaskDraft } from "@/lib/chief-of-staff/types";
import { prisma } from "@/lib/db/prisma";

const aiTaskSchema = z.object({
  title: z.string().min(3).max(120),
  detail: z.string().max(500).default(""),
  category: z.enum(["REVIEWS", "SOCIAL", "SEO", "EMAIL", "HOLIDAY", "MENU", "COMPETITOR", "OPERATIONS", "CONTENT"]),
  estimatedMinutes: z.number().int().min(1).max(120).default(10),
  draft: z
    .object({
      kind: z.enum(["email", "social_post", "review_reply", "content", "note"]),
      subject: z.string().max(160).optional(),
      body: z.string().max(3000),
    })
    .nullable()
    .optional(),
});

export type CreatedTaskResult =
  | { ok: true; task: ChiefOfStaffTaskDto; conversationId: string }
  | { ok: false; error: string };

const DRAFTABLE: TaskCategory[] = ["REVIEWS", "EMAIL", "SOCIAL", "CONTENT", "HOLIDAY"];


/**
 * Town-style "give a task": free text → AI categorize + optional draft →
 * ChiefOfStaffTask + linked chat thread for follow-up.
 */
export async function createTaskFromText(restaurantId: string, text: string): Promise<CreatedTaskResult> {
  const trimmed = text.trim();
  if (trimmed.length < 3) return { ok: false, error: "Task is too short." };

  const ctx = await buildGrowthAgentBriefingContext(restaurantId);
  const restaurantLine = ctx
    ? `Restaurant: ${ctx.name}${ctx.city ? `, ${ctx.city}` : ""}. Recent reviews: ${ctx.reviewSummary}. Website notes: ${ctx.websiteNotes}`
    : "Restaurant context unavailable.";

  const ai = await openaiJsonCompletion({
    system: `You are the Chief of Staff for a UK restaurant owner. Turn their request into one actionable task.

Return JSON:
{
  "title": "short imperative title",
  "detail": "1-2 sentence plan",
  "category": "REVIEWS|SOCIAL|SEO|EMAIL|HOLIDAY|MENU|COMPETITOR|OPERATIONS|CONTENT",
  "estimatedMinutes": number,
  "draft": { "kind": "email|social_post|review_reply|content|note", "subject": "optional", "body": "the prepared draft" } or null
}

If the request implies writing something (a post, email, reply, caption, announcement), produce the draft body now, on-brand and ready to review. Otherwise set draft to null. Never invent facts about the restaurant.`,
    user: `${restaurantLine}\n\nOwner request: ${trimmed.slice(0, 1000)}`,
    temperature: 0.5,
  });

  let parsed: z.infer<typeof aiTaskSchema>;
  if (ai.ok) {
    try {
      parsed = aiTaskSchema.parse(JSON.parse(ai.raw));
    } catch {
      parsed = fallbackTask(trimmed);
    }
  } else {
    parsed = fallbackTask(trimmed);
  }

  const draftPayload =
    parsed.draft && DRAFTABLE.includes(parsed.category)
      ? { kind: parsed.draft.kind, subject: parsed.draft.subject ?? null, body: parsed.draft.body, sourceText: trimmed }
      : undefined;

  const conversation = await prisma.conversation.create({
    data: {
      restaurantId,
      title: parsed.title.slice(0, 48),
      messages: {
        create: [
          { role: "USER", content: trimmed },
          {
            role: "ASSISTANT",
            content: draftPayload
              ? `Task created: "${parsed.title}". I've prepared a draft — review it on Today. Ask me here if you want changes.`
              : `Task created: "${parsed.title}". It's on your Today board. Ask me here if you want to adjust it.`,
          },
        ],
      },
    },
  });

  const task = await prisma.chiefOfStaffTask.create({
    data: {
      restaurantId,
      title: parsed.title,
      detail: parsed.detail,
      category: parsed.category,
      source: "MANUAL",
      impactLabel: "Your request",
      estimatedMinutes: parsed.estimatedMinutes,
      confidenceScore: 90,
      conversationId: conversation.id,
      draftPayload: draftPayload ?? undefined,
    },
  });

  const draft: TaskDraft | null = draftPayload
    ? { kind: draftPayload.kind, subject: draftPayload.subject, body: draftPayload.body }
    : null;

  const dto: ChiefOfStaffTaskDto = {
    id: task.id,
    title: task.title,
    detail: task.detail,
    category: task.category,
    source: task.source,
    status: task.status,
    impactLabel: task.impactLabel,
    estimatedMinutes: task.estimatedMinutes,
    confidenceScore: task.confidenceScore,
    revenueLowGbp: task.revenueLowGbp,
    revenueHighGbp: task.revenueHighGbp,
    requiresIntegration: task.requiresIntegration,
    auditId: task.auditId,
    conversationId: conversation.id,
    draft,
  };

  return { ok: true, task: dto, conversationId: conversation.id };
}

function fallbackTask(text: string): z.infer<typeof aiTaskSchema> {
  const lower = text.toLowerCase();
  let category: z.infer<typeof aiTaskSchema>["category"] = "OPERATIONS";
  if (/review|reply/.test(lower)) category = "REVIEWS";
  else if (/post|social|instagram|tiktok|facebook/.test(lower)) category = "SOCIAL";
  else if (/email|newsletter/.test(lower)) category = "EMAIL";
  else if (/menu|dish/.test(lower)) category = "MENU";
  else if (/holiday|christmas|easter|bank/.test(lower)) category = "HOLIDAY";
  else if (/seo|google|rank/.test(lower)) category = "SEO";
  else if (/blog|content|write/.test(lower)) category = "CONTENT";
  return {
    title: text.slice(0, 80),
    detail: "",
    category,
    estimatedMinutes: 10,
    draft: null,
  };
}
