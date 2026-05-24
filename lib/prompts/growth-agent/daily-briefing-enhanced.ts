import type { GrowthAgentBriefingContext } from "@/lib/growth-agent/restaurant-context";

const DAILY_BRIEFING_JSON_SHAPE = `{
  "warm_greeting": "1-2 sentences, personalized, positive",
  "brand_visual_pulse": "one short paragraph: overall brand + visual health + one standout observation",
  "visual_storytelling_opportunities": ["2-3 bullets: photo or Reel ideas; each may include a short prompt in quotes"],
  "website_conversion_opportunities": ["1-2 bullets: concrete site/CTA changes"],
  "reputation_block": "one paragraph: review trends + top reviewer opportunity + 1-2 short auto-reply drafts in quotes",
  "top_actions_today": [
    { "label": "Exact button label", "detail": "one line why" }
  ]
}`;

/** Enhanced daily briefing — structured sections + scannable bullets (emoji allowed sparingly). */
export function buildEnhancedDailyBriefingUserMessage(ctx: GrowthAgentBriefingContext): string {
  return `Generate today's Growth Briefing for ${ctx.name} in ${ctx.city ?? "their city"}.

Context snapshot:
- Cuisine: ${ctx.cuisine ?? "unspecified"}
- Vibe / positioning: ${ctx.vibe ?? "not set yet — infer gently from name + cuisine"}
- Brand assets summary: ${ctx.assetSummary}
- Latest visibility & visual health (internal 0–100): ${ctx.visibilityScore ?? "n/a"} / visual heuristic: ${ctx.visualHealthHint}
- Visibility audit (linked funnel): ${ctx.latestLinkedAuditSnapshot}
- Recent reviews summary: ${ctx.reviewSummary}
- Website: ${ctx.website ?? "not on file"}
- Website performance notes: ${ctx.websiteNotes}
- Traffic (7d): ${ctx.trafficEventsThisWeek} events, ${ctx.trafficChangeLabel}
- Open insight titles: ${ctx.openInsightTitles.length ? ctx.openInsightTitles.join(" | ") : "none"}
- Top workspace recommendation titles: ${ctx.recommendationTitles.length ? ctx.recommendationTitles.join(" | ") : "none"}

Return a single JSON object (no markdown fences) with exactly these keys:
${DAILY_BRIEFING_JSON_SHAPE}

Use bullet phrasing inside string arrays where helpful. At most one emoji per section header string if you use any at all. Sound like a trusted advisor texting the owner.`;
}
