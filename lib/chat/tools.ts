import { tool } from "ai";
import { z } from "zod";
import { executeChatTool } from "@/lib/chat/execute-tool";

export function buildChatTools(restaurantId: string) {
  return {
    run_daily_briefing: tool({
      description: "Generate the morning growth briefing for this restaurant.",
      inputSchema: z.object({}),
      execute: async () => executeChatTool(restaurantId, "run_daily_briefing", {}),
    }),
    draft_review_reply: tool({
      description: "Draft a reply to a specific customer review.",
      inputSchema: z.object({ reviewId: z.string() }),
      execute: async ({ reviewId }) => executeChatTool(restaurantId, "draft_review_reply", { reviewId }),
    }),
    create_task: tool({
      description: "Add a task to the Today board for the owner to approve.",
      inputSchema: z.object({
        title: z.string(),
        detail: z.string().optional(),
        category: z
          .enum(["REVIEWS", "SOCIAL", "SEO", "EMAIL", "HOLIDAY", "MENU", "COMPETITOR", "OPERATIONS", "CONTENT"])
          .optional(),
      }),
      execute: async (args) => executeChatTool(restaurantId, "create_task", args),
    }),
    pin_app: tool({
      description: "Pin a shortcut to the Apps hub.",
      inputSchema: z.object({
        title: z.string(),
        href: z.string(),
        description: z.string().optional(),
      }),
      execute: async (args) => executeChatTool(restaurantId, "pin_app", args),
    }),
    run_agent_job: tool({
      description: "Run a background agent job (audit refresh, lead scan, etc.).",
      inputSchema: z.object({
        job: z.enum(["growth/normalization.requested", "audit/run.requested"]),
      }),
      execute: async ({ job }) => executeChatTool(restaurantId, "run_agent_job", { job }),
    }),
    open_app: tool({
      description: "Tell the user which dashboard page to open.",
      inputSchema: z.object({ path: z.string() }),
      execute: async ({ path }) => executeChatTool(restaurantId, "open_app", { path }),
    }),
    generate_content_draft: tool({
      description:
        "Generate a real content draft (social post, email, Google post, TikTok concept, review reply) using AI. Use this when the owner asks you to write, draft, or create any marketing content.",
      inputSchema: z.object({
        type: z.enum([
          "INSTAGRAM_CAPTION",
          "EMAIL_CAMPAIGN",
          "GOOGLE_BUSINESS_POST",
          "TIKTOK_CONCEPT",
          "GROWTH_REVIEW_REPLY",
          "SEO_BLOG",
        ]),
        brief: z.string().describe("Specific brief for this piece of content, e.g. 'Father's Day, warm tone, mention Sunday roast'"),
      }),
      execute: async ({ type, brief }) => executeChatTool(restaurantId, "generate_content_draft", { type, brief }),
    }),
    generate_image: tool({
      description:
        "Generate a professional restaurant image with AI (Gemini). Use when the owner wants a photo, visual, or image for a post.",
      inputSchema: z.object({
        prompt: z
          .string()
          .describe("Description of the image, e.g. 'summer rooftop terrace, golden hour lighting, British cuisine on the table'"),
      }),
      execute: async ({ prompt }) => executeChatTool(restaurantId, "generate_image", { prompt }),
    }),
  };
}
