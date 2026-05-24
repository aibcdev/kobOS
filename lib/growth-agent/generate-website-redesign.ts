import { prisma } from "@/lib/db/prisma";
import {
  WEBSITE_REDESIGN_AGENT_SYSTEM,
  buildWebsiteRedesignUserMessage,
} from "@/lib/prompts/growth-agent/website-redesign-agent";
import { GROWTH_AGENT_SYSTEM_MASTER } from "@/lib/prompts/growth-agent/system-master";
import { buildGrowthAgentBriefingContext } from "@/lib/growth-agent/restaurant-context";
import { websiteRedesignJsonSchema, type WebsiteRedesignJson } from "@/lib/growth-agent/website-redesign-schema";
import { openaiJsonCompletion, parseJsonWithSchema } from "@/lib/growth-agent/openai-json-completion";

export type WebsiteRedesignResult = { ok: true; data: WebsiteRedesignJson } | { ok: false; error: string };

export async function generateWebsiteRedesign(restaurantId: string): Promise<WebsiteRedesignResult> {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) {
    return { ok: false, error: "Restaurant not found" };
  }
  if (!restaurant.website?.trim()) {
    return { ok: false, error: "Add a website URL on the restaurant before running the website redesign agent." };
  }

  const ctx = await buildGrowthAgentBriefingContext(restaurantId);
  if (!ctx) {
    return { ok: false, error: "Could not load workspace context" };
  }

  const audit =
    restaurant.city != null
      ? await prisma.visibilityAudit.findFirst({
          where: { city: restaurant.city },
          orderBy: { createdAt: "desc" },
        })
      : null;

  const parts = [
    `Internal workspace signals (not a live crawl): ${ctx.websiteNotes}`,
    `Tracked keywords: ${ctx.topKeywords.length ? ctx.topKeywords.join(", ") : "none"}.`,
    `Visibility index (workspace): ${ctx.visibilityScore ?? "n/a"}.`,
    `Traffic (7d): ${ctx.trafficEventsThisWeek} events (${ctx.trafficChangeLabel}).`,
    `Open insights: ${ctx.openInsightTitles.length ? ctx.openInsightTitles.join(" | ") : "none"}.`,
    `Top recommendations: ${ctx.recommendationTitles.length ? ctx.recommendationTitles.join(" | ") : "none"}.`,
    `Review snapshot: ${ctx.reviewSummary}`,
    `Brand assets: ${ctx.assetSummary}`,
    `Visual health hint: ${ctx.visualHealthHint}.`,
  ];

  if (audit) {
    parts.push(
      `Latest public visibility audit in same city (${audit.restaurantName}, score ${audit.overallScore}/100): design ${audit.designScore}, mobile ${audit.mobileScore}, conversion ${audit.conversionScore}.`,
    );
  } else {
    parts.push("No matching public visibility audit row for this city — rely on workspace signals above.");
  }

  const crawlSummary = parts.join(" ");

  const user = buildWebsiteRedesignUserMessage({
    url: restaurant.website.trim(),
    crawlSummary,
  });

  const completion = await openaiJsonCompletion({
    system: `${GROWTH_AGENT_SYSTEM_MASTER}\n\n${WEBSITE_REDESIGN_AGENT_SYSTEM}`,
    user,
    temperature: 0.65,
  });
  if (!completion.ok) {
    return completion;
  }

  const parsed = parseJsonWithSchema(completion.raw, websiteRedesignJsonSchema);
  if (!parsed.ok) {
    return parsed;
  }
  return { ok: true, data: parsed.data };
}
