import OpenAI from "openai";
import { GROWTH_AGENT_SYSTEM_MASTER, buildEnhancedDailyBriefingUserMessage } from "@/lib/prompts/growth-agent";
import { buildGrowthAgentBriefingContext } from "@/lib/growth-agent/restaurant-context";
import { dailyBriefingJsonSchema, type DailyBriefingJson } from "@/lib/growth-agent/daily-briefing-schema";

export type DailyBriefingResult =
  | { ok: true; briefing: DailyBriefingJson }
  | { ok: false; error: string };

export async function generateDailyBriefing(restaurantId: string): Promise<DailyBriefingResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "OPENAI_API_KEY is not configured" };
  }

  const ctx = await buildGrowthAgentBriefingContext(restaurantId);
  if (!ctx) {
    return { ok: false, error: "Restaurant not found" };
  }

  const user = buildEnhancedDailyBriefingUserMessage(ctx);
  const client = new OpenAI({ apiKey });

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  try {
    const res = await client.chat.completions.create({
      model,
      temperature: 0.65,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: GROWTH_AGENT_SYSTEM_MASTER },
        { role: "user", content: user },
      ],
    });

    const raw = res.choices[0]?.message?.content?.trim();
    if (!raw) {
      return { ok: false, error: "Empty model response" };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: "Model returned non-JSON" };
    }

    const checked = dailyBriefingJsonSchema.safeParse(parsed);
    if (!checked.success) {
      return { ok: false, error: "Briefing JSON failed validation" };
    }

    return { ok: true, briefing: checked.data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "OpenAI request failed";
    return { ok: false, error: msg };
  }
}
