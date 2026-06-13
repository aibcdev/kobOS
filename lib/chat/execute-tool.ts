import { ContentType, TaskCategory, TaskSource } from "@prisma/client";
import { inngest } from "@/inngest/client";
import { generateDailyBriefing } from "@/lib/growth-agent/generate-daily-briefing";
import { generateReviewRelationship } from "@/lib/growth-agent/generate-review-relationship";
import { generateAndStoreContent } from "@/lib/ai/content";
import { generateImage } from "@/lib/ai/generate-image";
import { prisma } from "@/lib/db/prisma";

export type ToolResult = { ok: true; summary: string; link?: string; taskId?: string } | { ok: false; error: string };

export async function executeChatTool(
  restaurantId: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  switch (toolName) {
    case "run_daily_briefing": {
      const result = await generateDailyBriefing(restaurantId);
      if (!result.ok) return { ok: false, error: result.error };
      return {
        ok: true,
        summary: "Daily briefing generated. Open Growth Agent or Today to review.",
        link: `/dashboard/growth-agent?r=${restaurantId}`,
      };
    }
    case "draft_review_reply": {
      const reviewId = String(args.reviewId ?? "");
      if (!reviewId) return { ok: false, error: "reviewId required" };
      const result = await generateReviewRelationship(restaurantId, reviewId);
      if (!result.ok) return { ok: false, error: result.error };
      return {
        ok: true,
        summary: "Review reply draft ready on Reviews page.",
        link: `/dashboard/reviews?r=${restaurantId}`,
      };
    }
    case "create_task": {
      const title = String(args.title ?? "Task from chat");
      const detail = String(args.detail ?? "");
      const category = (args.category as TaskCategory) ?? TaskCategory.CONTENT;
      const task = await prisma.chiefOfStaffTask.create({
        data: {
          restaurantId,
          title,
          detail,
          category,
          source: TaskSource.MANUAL,
          impactLabel: "From chat",
          estimatedMinutes: 10,
          confidenceScore: 80,
        },
      });
      await prisma.agentAction.create({
        data: {
          restaurantId,
          actionType: "create_task",
          description: title,
          status: "COMPLETED",
        },
      });
      return {
        ok: true,
        summary: `Task "${title}" added to Today.`,
        link: `/dashboard?r=${restaurantId}`,
        taskId: task.id,
      };
    }
    case "pin_app": {
      const title = String(args.title ?? "Custom app");
      const href = String(args.href ?? "/dashboard");
      const description = String(args.description ?? "");
      await prisma.workspaceAppPin.create({
        data: { restaurantId, title, href, description },
      });
      return {
        ok: true,
        summary: `"${title}" pinned to Apps.`,
        link: `/dashboard/apps?r=${restaurantId}`,
      };
    }
    case "run_agent_job": {
      const job = String(args.job ?? "growth/normalization.requested");
      await inngest.send({ name: job, data: { restaurantId } });
      await prisma.agentAction.create({
        data: {
          restaurantId,
          actionType: job,
          description: `Background job: ${job}`,
          status: "PENDING",
        },
      });
      return { ok: true, summary: `Started background job: ${job}.` };
    }
    case "open_app": {
      const path = String(args.path ?? "/dashboard/apps");
      return { ok: true, summary: `Open ${path}`, link: `${path}?r=${restaurantId}` };
    }
    case "generate_content_draft": {
      const typeRaw = String(args.type ?? "INSTAGRAM_CAPTION");
      const brief = String(args.brief ?? "");
      const validTypes = Object.values(ContentType);
      const type = validTypes.includes(typeRaw as ContentType) ? (typeRaw as ContentType) : ContentType.INSTAGRAM_CAPTION;
      const result = await generateAndStoreContent({
        restaurantId,
        type,
        extraPrompt: brief,
        withImage: false,
      });
      if ("error" in result) {
        return { ok: false, error: result.error };
      }
      const preview = result.output.slice(0, 300);
      const imageNote = result.imageUrl ? " An image was also generated." : "";
      return {
        ok: true,
        summary: `Draft created.${imageNote} Preview: "${preview}${result.output.length > 300 ? "…" : ""}"`,
        link: `/dashboard/content?r=${restaurantId}`,
      };
    }
    case "generate_image": {
      const prompt = String(args.prompt ?? "restaurant dining scene");
      const result = await generateImage(prompt);
      if (!result.ok) {
        return { ok: false, error: result.error };
      }
      return {
        ok: true,
        summary: `Image generated. View it at: ${result.url}`,
        link: result.url,
      };
    }
    default:
      return { ok: false, error: `Unknown tool: ${toolName}` };
  }
}
