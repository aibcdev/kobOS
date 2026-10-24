import type { AiPersonality } from "@prisma/client";

import type { TodayBriefPayload } from "@/lib/chief-of-staff/types";
import type { TodayJourneySnapshot } from "@/lib/dashboard/load-today-journey";

function greetingFor(name: string): string {
  const hour = new Date().getHours();
  const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const short = name.split(/\s+/)[0] || name;
  return `${part}, ${short}.`;
}

/**
 * First-paint brief built only from what the audit actually recorded — no Gemini call.
 *
 * Today's priority rows come straight from `journey.topFixes`, so this deliberately
 * ships no tasks of its own: the summary carries the audit
 * figures, and every number here is omitted when the audit never produced it.
 */
export function shellTodayBriefWithJourney(
  restaurantName: string,
  aiPersonality: AiPersonality = "BALANCED",
  journey: TodayJourneySnapshot | null,
): TodayBriefPayload {
  const lostCustomers = journey?.estMonthlyLostCustomers ?? null;
  const evidence = journey?.report.evidence;

  const needToKnow: string[] = [];
  if (journey?.overallScore != null) {
    needToKnow.push(`Audit score: ${journey.overallScore}/100`);
  }
  if (journey?.designScore != null) {
    needToKnow.push(`Website design score: ${journey.designScore}/100`);
  }

  return {
    greeting: greetingFor(restaurantName),
    aiPersonality,
    generatedAt: "",
    summary: {
      revenueHealthLine:
        lostCustomers != null
          ? `Your audit estimates about ${lostCustomers} customers a month are slipping away.`
          : journey
            ? "Your audit is linked — your fixes are below."
            : "Run an audit to see where guests drop off.",
      revenueHeadline: null,
      taskCount: journey?.topFixes.length ?? 0,
      totalMinutes: 0,
      // Revenue ranges are modelled off the lost-customer estimate; without it we show nothing.
      revenueOpportunityLow: lostCustomers != null ? (evidence?.revenueLowGbp ?? null) : null,
      revenueOpportunityHigh: lostCustomers != null ? (evidence?.revenueHighGbp ?? null) : null,
      needToKnow,
      suggestions: journey?.topFixes.slice(0, 1).map((f) => f.title) ?? [],
      // The shell doesn't know the restaurant's country; local dates come with the real brief.
      holidayBlock: null,
    },
    tasks: [],
  };
}
