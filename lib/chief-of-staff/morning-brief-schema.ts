import { z } from "zod";

export const morningBriefAiSchema = z.object({
  revenueHealthLine: z.string().default("Revenue signals are still building."),
  needToKnow: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([]),
  aiTasks: z
    .array(
      z.object({
        title: z.string(),
        detail: z.string().default(""),
        category: z
          .enum(["REVIEWS", "SOCIAL", "SEO", "EMAIL", "HOLIDAY", "MENU", "COMPETITOR", "OPERATIONS", "CONTENT"])
          .default("OPERATIONS"),
        impactLabel: z.string().optional(),
        estimatedMinutes: z.number().int().min(1).max(120).default(5),
        confidenceScore: z.number().int().min(0).max(100).default(75),
        requiresIntegration: z.string().optional(),
      }),
    )
    .default([]),
});

export type MorningBriefAiJson = z.infer<typeof morningBriefAiSchema>;
