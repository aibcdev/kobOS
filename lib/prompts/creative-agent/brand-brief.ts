/** Creative Agent — brand identity brief prompts. */

export const CREATIVE_BRAND_BRIEF_SYSTEM = `You are a creative director for independent restaurants.
Output only valid JSON (no fences). Be specific, visual, and hospitality-native.
Focus on identity that drives UGC-style ads and food photography.`;

export function buildCreativeBrandBriefUserMessage(input: {
  restaurantName: string;
  cuisine: string;
  city: string;
  vibe: string;
  websiteSnippet: string;
  dishHints: string[];
}): string {
  const dishes = input.dishHints.length ? input.dishHints.join(", ") : "infer hero dishes from cuisine";
  return `Restaurant: ${input.restaurantName}
Cuisine: ${input.cuisine || "independent restaurant"}
City: ${input.city || "unknown"}
Vibe: ${input.vibe || "warm, local, premium casual"}
Hero dish hints: ${dishes}

Website / brand signals (may be empty):
${input.websiteSnippet.slice(0, 4000) || "(no website scrape available)"}

Return JSON:
{
  "tagline": "",
  "voice": "",
  "palette": ["#hex", "#hex", "#hex"],
  "visualStyle": "",
  "audience": "",
  "heroDishes": ["", "", "", ""],
  "ugcHooks": ["", "", "", ""],
  "doNots": ["", ""]
}`;
}

export type CreativeBrandBrief = {
  tagline: string;
  voice: string;
  palette: string[];
  visualStyle: string;
  audience: string;
  heroDishes: string[];
  ugcHooks: string[];
  doNots: string[];
};

export type CreativeShotPlan = {
  kind: "ugc" | "dish";
  title: string;
  imagePrompt: string;
  caption: string;
};

export const CREATIVE_SHOT_PLAN_SYSTEM = `You are a restaurant creative producer.
Output only valid JSON (no fences). Plan a month of scroll-stopping UGC ads and dish photography.
Image prompts must be production-ready for AI image models: no text/logos in the image, warm lighting, appetising.`;

export function buildCreativeShotPlanUserMessage(input: {
  restaurantName: string;
  cuisine: string;
  city: string;
  brief: CreativeBrandBrief;
  count: number;
}): string {
  return `Restaurant: ${input.restaurantName} (${input.cuisine || "restaurant"}) in ${input.city || "local area"}.
Brand brief:
${JSON.stringify(input.brief)}

Plan exactly ${input.count} creatives for one month of posting.
Mix roughly half UGC-style lifestyle/handheld ads and half plated dish / hero food photography.

Return JSON:
{
  "shots": [
    {
      "kind": "ugc" | "dish",
      "title": "short label",
      "imagePrompt": "detailed photo prompt",
      "caption": "Instagram-ready caption, under 400 chars, 1-2 emoji max, soft CTA"
    }
  ]
}`;
}
