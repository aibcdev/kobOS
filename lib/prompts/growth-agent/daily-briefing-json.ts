import type { GrowthAgentBriefingContext } from "@/lib/growth-agent/restaurant-context";

/** User message for JSON-mode daily briefing (Overview + focused scan). */
export function buildDailyBriefingUserMessage(ctx: GrowthAgentBriefingContext): string {
  const kw = ctx.topKeywords.length ? ctx.topKeywords.join(", ") : "(none on file — suggest seeding keywords)";

  return `Perform a full daily growth briefing for this restaurant.

Restaurant context:
- Name: ${ctx.name}
- Cuisine: ${ctx.cuisine ?? "not specified"}
- Location: ${ctx.city ?? "unknown"}${ctx.state ? `, ${ctx.state}` : ""}
- Website: ${ctx.website ?? "not on file"}
- Visibility score (internal estimate 0–100): ${ctx.visibilityScore ?? "n/a — add keywords or run public audit"}
- Traffic: ${ctx.trafficEventsThisWeek} tracked site events (7d), prior week ${ctx.trafficEventsPrevWeek}, change about ${ctx.trafficChangeLabel}
- Open growth insights (titles): ${ctx.openInsightTitles.length ? ctx.openInsightTitles.join(" | ") : "none"}
- Top recommendations already in workspace (titles): ${ctx.recommendationTitles.length ? ctx.recommendationTitles.join(" | ") : "none"}
- Top keywords: ${kw}

Return a single JSON object with exactly these keys (arrays may be empty, strings non-null):
{
  "greeting": "short warm opener using owner/chef tone",
  "good_news": ["1-2 wins or positive signals from context; if thin, say what to measure next"],
  "brand_pulse": "one paragraph: brand health + visual strength from what you know",
  "visual_opportunities": ["2-4 bullets: food photo / video / hero imagery ideas"],
  "website_wins_and_fixes": ["3-5 bullets: hero, menu, mobile, trust, speed — prioritized"],
  "reputation_and_relationships": "one paragraph: reviews, replies, VIP reviewer ideas",
  "watch_out": ["0-2 risks or gaps"],
  "big_opportunity": {
    "title": "",
    "description": "",
    "impact": "e.g. +30–50 reservation clicks/mo (estimate)",
    "action_label": "short CTA label",
    "action_type": "create_seo_page | update_website | generate_assets | reply_reviews | other"
  },
  "quick_wins": [
    { "title": "", "detail": "", "action_label": "" }
  ],
  "top_actions_today": [
    { "title": "", "action_label": "", "action_type": "string" }
  ]
}

Use motivating, specific language for ${ctx.name} in ${ctx.city ?? "their market"}.`;

}
