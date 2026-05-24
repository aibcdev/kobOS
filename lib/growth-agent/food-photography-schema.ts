import { z } from "zod";

export const foodPhotographyDishSchema = z.object({
  dish_name: z.string(),
  current_assessment: z.string(),
  improvement_brief: z.string(),
  ai_generation_prompt: z.string(),
  video_idea: z.string(),
});

export const foodPhotographyJsonSchema = z.object({
  dishes: z.array(foodPhotographyDishSchema).min(1).max(5),
});

export type FoodPhotographyJson = z.infer<typeof foodPhotographyJsonSchema>;
