import { geminiConfigError, geminiJsonCompletion, isGeminiConfigured } from "@/lib/ai/gemini-config";
import { GROWTH_AGENT_SYSTEM_MASTER, buildEnhancedDailyBriefingUserMessage } from "@/lib/prompts/growth-agent";
import { buildGrowthAgentBriefingContext } from "@/lib/growth-agent/restaurant-context";
import { dailyBriefingJsonSchema, type DailyBriefingJson } from "@/lib/growth-agent/daily-briefing-schema";

export type DailyBriefingResult =
  | { ok: true; briefing: DailyBriefingJson }
  | { ok: false; error: string };

export async function generateDailyBriefing(restaurantId: string): Promise<DailyBriefingResult> {
  if (!isGeminiConfigured()) {
    return { ok: false, error: geminiConfigError() };
  }

  const ctx = await buildGrowthAgentBriefingContext(restaurantId);
  if (!ctx) {
    return { ok: false, error: "Restaurant not found" };
  }

  const user = buildEnhancedDailyBriefingUserMessage(ctx);
  const completion = await geminiJsonCompletion({
    system: GROWTH_AGENT_SYSTEM_MASTER,
    user,
    temperature: 0.65,
  });

  if (!completion.ok) {
    return { ok: false, error: completion.error };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(completion.raw);
  } catch {
    return { ok: false, error: "Model returned non-JSON" };
  }

  const checked = dailyBriefingJsonSchema.safeParse(parsed);
  if (!checked.success) {
    return { ok: false, error: "Briefing JSON failed validation" };
  }

  return { ok: true, briefing: checked.data };
}
