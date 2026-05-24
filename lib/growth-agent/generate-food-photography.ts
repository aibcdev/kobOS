import {
  FOOD_PHOTOGRAPHY_AGENT_SYSTEM,
  buildFoodPhotographyUserMessage,
} from "@/lib/prompts/growth-agent/food-photography-agent";
import { GROWTH_AGENT_SYSTEM_MASTER } from "@/lib/prompts/growth-agent/system-master";
import { buildGrowthAgentBriefingContext } from "@/lib/growth-agent/restaurant-context";
import { foodPhotographyJsonSchema, type FoodPhotographyJson } from "@/lib/growth-agent/food-photography-schema";
import { openaiJsonCompletion, parseJsonWithSchema } from "@/lib/growth-agent/openai-json-completion";

export type FoodPhotographyResult = { ok: true; data: FoodPhotographyJson } | { ok: false; error: string };

export async function generateFoodPhotography(
  restaurantId: string,
  options?: { dishCategories?: string[] },
): Promise<FoodPhotographyResult> {
  const ctx = await buildGrowthAgentBriefingContext(restaurantId);
  if (!ctx) {
    return { ok: false, error: "Restaurant not found" };
  }

  const user = buildFoodPhotographyUserMessage({
    restaurantName: ctx.name,
    cuisine: ctx.cuisine ?? "General",
    city: ctx.city ?? "Unknown market",
    vibe: ctx.vibe ?? "Premium neighborhood restaurant",
    dishCategories: options?.dishCategories ?? [],
  });

  const completion = await openaiJsonCompletion({
    system: `${GROWTH_AGENT_SYSTEM_MASTER}\n\n${FOOD_PHOTOGRAPHY_AGENT_SYSTEM}`,
    user,
    temperature: 0.7,
  });
  if (!completion.ok) {
    return completion;
  }

  const parsed = parseJsonWithSchema(completion.raw, foodPhotographyJsonSchema);
  if (!parsed.ok) {
    return parsed;
  }
  return { ok: true, data: parsed.data };
}
