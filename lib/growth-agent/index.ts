import { generateDailyBriefing, type DailyBriefingResult } from "@/lib/growth-agent/generate-daily-briefing";

/**
 * Facade object for programmatic / external integrations (mirrors common “service class” pattern).
 * Core logic stays in thin modules under this directory.
 */
export class GrowthAgent {
  async generateDailyBriefing(restaurantId: string): Promise<DailyBriefingResult> {
    return generateDailyBriefing(restaurantId);
  }
}

export const growthAgent = new GrowthAgent();

export { generateDailyBriefing } from "@/lib/growth-agent/generate-daily-briefing";
