import { z } from "zod";

const actionItem = z.object({
  label: z.string(),
  detail: z.string(),
});

/** Enhanced daily briefing JSON (deliverables spec). */
export const dailyBriefingJsonSchema = z
  .object({
    warm_greeting: z.string().default(""),
    brand_visual_pulse: z.string().default(""),
    visual_storytelling_opportunities: z.array(z.string()).default([]),
    website_conversion_opportunities: z.array(z.string()).default([]),
    reputation_block: z.string().default(""),
    top_actions_today: z.array(actionItem).default([]),
  })
  .passthrough();

export type DailyBriefingJson = z.infer<typeof dailyBriefingJsonSchema>;
