/** Food photography & video — JSON dish analysis (top 5 categories). */
export const FOOD_PHOTOGRAPHY_AGENT_SYSTEM = `You are a world-class food photographer and videographer consultant for restaurants.
Output only valid JSON (no fences). Be highly specific about lighting, composition, plating, and camera angle.
Each dish entry must include a production-ready AI image prompt (Midjourney / Flux / Grok Imagine style).`;

export function buildFoodPhotographyUserMessage(input: {
  restaurantName: string;
  cuisine: string;
  city: string;
  vibe: string;
  dishCategories: string[];
}): string {
  const dishes = input.dishCategories.length ? input.dishCategories.join(", ") : "Infer 5 hero categories from cuisine";
  return `Restaurant: ${input.restaurantName} — ${input.cuisine} in ${input.city}. Vibe: ${input.vibe}.

Analyze current food images (or lack thereof). For these dishes/categories: ${dishes}

Return JSON:
{
  "dishes": [
    {
      "dish_name": "",
      "current_assessment": "",
      "improvement_brief": "",
      "ai_generation_prompt": "",
      "video_idea": ""
    }
  ]
}
Provide up to 5 entries. Prioritize dishes that photograph well and drive orders.`;

}
