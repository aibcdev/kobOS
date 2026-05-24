import { z } from "zod";

export const outboundLeadItemSchema = z.object({
  restaurant_name_guess: z.string(),
  visible_problem: z.string(),
  email_subject: z.string(),
  message_body: z.string(),
  suggested_tone: z.string(),
  channel: z.enum(["email", "instagram_dm"]),
});

export const outboundDraftJsonSchema = z.object({
  leads: z.array(outboundLeadItemSchema).min(1).max(20),
});

export type OutboundDraftJson = z.infer<typeof outboundDraftJsonSchema>;
