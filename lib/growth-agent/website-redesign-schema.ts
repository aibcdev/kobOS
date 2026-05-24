import { z } from "zod";

export const websiteRedesignSectionSchema = z.object({
  section: z.string(),
  current_problems: z.array(z.string()),
  recommended_solution: z.string(),
  visual_direction: z.string(),
  copy_headline: z.string(),
  copy_subheadline: z.string(),
  copy_cta: z.string(),
  expected_impact: z.string(),
  action: z.string(),
});

export const websiteRedesignJsonSchema = z.object({
  sections: z.array(websiteRedesignSectionSchema).min(1),
});

export type WebsiteRedesignJson = z.infer<typeof websiteRedesignJsonSchema>;
