import type { TodayBriefPayload, ChiefOfStaffTaskDto } from "@/lib/chief-of-staff/types";
import type { TodayJourneySnapshot } from "@/lib/dashboard/load-today-journey";
import { nextUkHoliday } from "@/lib/chief-of-staff/uk-holidays";
import type { AiPersonality, TaskCategory } from "@prisma/client";
import type { DecisionJourneyReport } from "@/lib/audit/decision-journey";

export type JourneyPriorityHint = {
  id: string;
  title: string;
  detail: string;
  category: TaskCategory;
  estimatedMinutes: number;
  revenueHighGbp: number | null;
};

/**
 * Instant owner priorities from the linked audit journey — no Gemini.
 * These are the "Improve homepage / Make booking obvious" rows in the reference UI.
 */
export function prioritiesFromJourney(
  journey: TodayJourneySnapshot | null,
): JourneyPriorityHint[] {
  if (!journey?.report) return [];
  const report = journey.report;
  const customersHigh = Math.max(1, report.evidence.customersHigh || 69);
  const share = (weight: number) => Math.max(8, Math.round(customersHigh * weight));

  const fromDropOffs = report.dropOffs.slice(0, 3).map((d, i) => {
    const detail = report.stageDetails.find((s) => s.stageId === d.stageId);
    const title =
      detail?.highestLeverageFix?.trim() ||
      d.headline?.trim() ||
      `Fix ${d.stageLabel.toLowerCase()} drop-off`;
    return {
      id: `journey-${d.stageId}-${i}`,
      title,
      detail: d.body || detail?.whyItMatters || `Guests drop off at ${d.stageLabel}.`,
      category: categoryForStage(d.stageId),
      estimatedMinutes: minutesForStage(d.stageId),
      revenueHighGbp: share(i === 0 ? 0.4 : i === 1 ? 0.3 : 0.2) * 18,
    };
  });

  if (fromDropOffs.length >= 2) return fromDropOffs;

  return report.repairPlan.slice(0, 3).map((w, i) => ({
    id: `journey-week-${w.week}`,
    title: w.action,
    detail: `${w.title} — ${w.stageLabel} is where guests leave.`,
    category: categoryForStageLabel(w.stageLabel),
    estimatedMinutes: 12,
    revenueHighGbp: share(i === 0 ? 0.4 : i === 1 ? 0.3 : 0.2) * 18,
  }));
}

function categoryForStage(stageId: string): TaskCategory {
  if (stageId === "trust") return "REVIEWS";
  if (stageId === "desire") return "CONTENT";
  if (stageId === "discovery") return "SEO";
  return "SEO";
}

function categoryForStageLabel(label: string): TaskCategory {
  const l = label.toLowerCase();
  if (l.includes("trust")) return "REVIEWS";
  if (l.includes("desire")) return "CONTENT";
  if (l.includes("discover")) return "SEO";
  return "SEO";
}

function minutesForStage(stageId: string): number {
  if (stageId === "trust") return 12;
  if (stageId === "desire") return 15;
  if (stageId === "conversion") return 10;
  return 12;
}

function greetingFor(name: string): string {
  const hour = new Date().getHours();
  const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const short = name.split(/\s+/)[0] || name;
  return `${part}, ${short}.`;
}

/**
 * Instant brief shell that already looks like the upgraded Today page —
 * holiday card + journey stats — without waiting on Gemini.
 */
export function shellTodayBriefWithJourney(
  restaurantName: string,
  aiPersonality: AiPersonality = "BALANCED",
  journey: TodayJourneySnapshot | null,
): TodayBriefPayload {
  const holiday = nextUkHoliday();
  const priorities = prioritiesFromJourney(journey);
  const customersHigh = journey?.report.evidence.customersHigh ?? 0;
  const customersLow = journey?.report.evidence.customersLow ?? 0;
  const overall = journey?.overallScore;

  const tasks: ChiefOfStaffTaskDto[] = priorities.map((p) => ({
    id: p.id,
    title: p.title,
    detail: p.detail,
    category: p.category,
    source: "AUDIT",
    status: "PENDING",
    impactLabel: "From your audit · high impact",
    estimatedMinutes: p.estimatedMinutes,
    confidenceScore: 80,
    revenueLowGbp: p.revenueHighGbp != null ? Math.round(p.revenueHighGbp * 0.6) : null,
    revenueHighGbp: p.revenueHighGbp,
    requiresIntegration: null,
    auditId: journey?.auditId ?? null,
    conversationId: null,
    draft: null,
  }));

  const needToKnow: string[] = [];
  if (holiday) {
    needToKnow.push(`Next UK event: ${holiday.event.name} in ${holiday.daysAway} days.`);
  }
  if (overall != null) {
    needToKnow.push(`Linked audit overall score: ${overall}/100`);
  }
  if (journey?.designScore != null) {
    needToKnow.push(`Linked audit design score: ${journey.designScore}/100`);
  }

  const suggestions: string[] = [];
  const trustFix = journey?.report.stageDetails.find((s) => s.stageId === "trust")?.highestLeverageFix;
  if (trustFix?.toLowerCase().includes("review")) {
    suggestions.push("Reply to new Google reviews to show customers you care.");
  } else if (priorities[0]) {
    suggestions.push(priorities[0].title);
  }

  return {
    greeting: greetingFor(restaurantName),
    aiPersonality,
    generatedAt: "",
    summary: {
      revenueHealthLine:
        customersHigh > 0
          ? `You're leaving ~${customersLow || Math.round(customersHigh * 0.6)}–${customersHigh} customers / month on the table.`
          : "Your linked audit is ready — priorities below.",
      revenueHeadline:
        customersHigh > 0
          ? `You could get +${customersHigh} more customers every month`
          : null,
      taskCount: tasks.length,
      totalMinutes: tasks.reduce((s, t) => s + t.estimatedMinutes, 0),
      revenueOpportunityLow: journey?.report.evidence.revenueLowGbp ?? null,
      revenueOpportunityHigh: journey?.report.evidence.revenueHighGbp ?? null,
      needToKnow,
      suggestions,
      holidayBlock: holiday
        ? {
            eventName: holiday.event.name,
            daysAway: holiday.daysAway,
            emailPrepared: false,
            instagramPrepared: false,
            bannerPrepared: false,
          }
        : null,
    },
    tasks,
  };
}

/** @deprecated prefer shellTodayBriefWithJourney when a journey exists */
export function emptyShellBrief(
  restaurantName: string,
  aiPersonality: AiPersonality = "BALANCED",
): TodayBriefPayload {
  return shellTodayBriefWithJourney(restaurantName, aiPersonality, null);
}

export function journeyHeadlineCustomers(report: DecisionJourneyReport | null | undefined): number {
  if (!report) return 0;
  return report.evidence.customersHigh || 0;
}
