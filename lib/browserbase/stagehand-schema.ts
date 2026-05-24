import { z } from "zod";

/** Stagehand structured extraction for restaurant marketing audits (v1). */
export const auditStagehandExtractionSchema = z.object({
  restaurant: z.object({
    name: z.string(),
    cuisine: z.string(),
    location: z.string(),
    vibe: z.string(),
  }),
  hero: z.object({
    headline: z.string(),
    cta_buttons: z.array(z.string()),
    image_description: z.string(),
  }),
  menu: z.object({
    categories: z.array(z.string()),
    top_dishes: z.array(z.object({ name: z.string(), description: z.string().optional() })),
  }),
  visuals: z.object({
    food_images: z.array(
      z.object({
        description: z.string(),
        quality_assessment: z.string(),
        improvement_suggestions: z.string(),
      }),
    ),
    videos: z.array(
      z.object({
        description: z.string(),
        length_estimate: z.string().optional(),
      }),
    ),
  }),
  seo: z.object({
    meta_title: z.string(),
    meta_description: z.string(),
    headings: z.array(z.string()),
    local_keywords: z.array(z.string()),
  }),
  conversion_elements: z.array(
    z.object({
      type: z.string(),
      location: z.string(),
      text: z.string(),
    }),
  ),
});

export type AuditStagehandExtraction = z.infer<typeof auditStagehandExtractionSchema>;

export const AUDIT_STAGEHAND_INSTRUCTION = `Analyze this restaurant website thoroughly. Extract and structure:

- Restaurant name, cuisine type, location, and vibe/tone
- Hero: headline, subheadline implied in headline, CTA button labels, primary image description
- Menu: categories, notable dishes, description quality hints
- Food imagery: visible food photos with quality notes (lighting, styling, appetite appeal)
- Video: embedded videos or promos with short descriptions
- Conversion: reservation, order online, forms, phone, address
- SEO: meta title, meta description, key headings, local keywords
- Brand feel in vibe field

Return rich structured data for an AI growth coach.`;
