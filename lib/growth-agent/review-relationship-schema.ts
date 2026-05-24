import { z } from "zod";

export const reviewRelationshipJsonSchema = z.object({
  best_reply: z.string().max(500),
  personalization_score: z.number().int().min(1).max(10),
  personalization_why: z.string(),
  relationship_next_step: z.string(),
  long_term_nurture_idea: z.string(),
});

export type ReviewRelationshipJson = z.infer<typeof reviewRelationshipJsonSchema>;
