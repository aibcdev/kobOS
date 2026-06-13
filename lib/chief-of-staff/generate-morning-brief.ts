import type { AiPersonality } from "@prisma/client";
import { geminiJsonCompletion, isGeminiConfigured } from "@/lib/ai/gemini-config";
import { buildAuditTasksForRestaurant, fetchLatestLinkedAudit } from "@/lib/chief-of-staff/build-audit-tasks";
import { morningBriefAiSchema } from "@/lib/chief-of-staff/morning-brief-schema";
import type { TaskDraftInput, TodayBriefSummary } from "@/lib/chief-of-staff/types";
import { nextUkHoliday } from "@/lib/chief-of-staff/uk-holidays";
import { buildOwnerHeroFallback } from "@/lib/audit/build-owner-hero";
import { parseAuditPayload } from "@/lib/audit/types";
import { buildGrowthAgentBriefingContext } from "@/lib/growth-agent/restaurant-context";
import { getCalendarSnapshot, type CalendarEventSnapshot } from "@/lib/integrations/providers/google-calendar";
import { getGmailSnapshot } from "@/lib/integrations/providers/gmail";
import { prisma } from "@/lib/db/prisma";

function greetingForHour(name: string): string {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${part}, ${name}.`;
}

function todaysEvents(events: CalendarEventSnapshot[]): CalendarEventSnapshot[] {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  return events.filter((e) => {
    const start = new Date(e.start);
    return start >= now && start <= endOfDay;
  });
}

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" });
}

function personalityTone(p: AiPersonality): string {
  const map: Record<AiPersonality, string> = {
    BALANCED: "balanced and clear",
    WARM: "warm and encouraging",
    DIRECT: "direct and efficient",
    CONCISE: "very concise",
    SASSY: "lightly witty but professional",
  };
  return map[p];
}

function ruleBasedAiTasks(
  ctx: { name: string; city: string | null; reviewSummary: string; latestLinkedAuditSnapshot: string },
  holidayName: string | null,
  daysAway: number | null,
  competitors: string[],
): TaskDraftInput[] {
  const place = ctx.city ? ` in ${ctx.city}` : "";
  const tasks: TaskDraftInput[] = [
    {
      title: `Create 3 social post drafts for ${ctx.name}`,
      detail: competitors.length
        ? `${competitors.slice(0, 2).join(" and ")} post frequently. Approve this to get 3 ready-to-use captions — nothing goes live until you publish.`
        : `Consistent posting keeps ${ctx.name} visible. Approve to get 3 caption drafts ready for review.`,
      category: "SOCIAL",
      source: "AI",
      impactLabel: "+reach",
      estimatedMinutes: 5,
      confidenceScore: 72,
    },
    {
      title: "Respond to Instagram DMs",
      detail: "Quick replies convert enquiries into bookings.",
      category: "SOCIAL",
      source: "AI",
      estimatedMinutes: 4,
      confidenceScore: 68,
      requiresIntegration: "Instagram",
    },
    {
      title: "Check booking enquiries in inbox",
      detail: "Unanswered enquiries often go to a competitor.",
      category: "EMAIL",
      source: "AI",
      estimatedMinutes: 6,
      confidenceScore: 70,
      requiresIntegration: "Email inbox",
    },
    {
      title: "Add 5 customer photos to Google Business Profile",
      detail: "Fresh photos improve click-through from search and maps.",
      category: "CONTENT",
      source: "AI",
      impactLabel: "Local discovery",
      estimatedMinutes: 8,
      confidenceScore: 80,
    },
  ];

  if (holidayName && daysAway != null && daysAway <= 21) {
    tasks.unshift({
      title: `Approve ${holidayName} campaign for ${ctx.name}`,
      detail: `${holidayName} is ${daysAway} days away — draft email and social once you approve.`,
      category: "HOLIDAY",
      source: "AI",
      impactLabel: "Seasonal revenue",
      estimatedMinutes: 3,
      confidenceScore: 86,
    });
  }

  return tasks;
}

async function callMorningBriefAi(
  ctx: NonNullable<Awaited<ReturnType<typeof buildGrowthAgentBriefingContext>>>,
  personality: AiPersonality,
  holidayLine: string,
): Promise<TaskDraftInput[]> {
  if (!isGeminiConfigured()) return [];

  const system = `You are KOB, the daily helper for UK independent restaurants—plain English, efficiency-first, never miss reviews/holidays/hours/posts. Tone: ${personalityTone(personality)}. Return JSON only.`;
  const user = `Restaurant: ${ctx.name}, ${ctx.city ?? "UK"}.
Visibility: ${ctx.visibilityScore ?? "unknown"}/100.
Audit snapshot: ${ctx.latestLinkedAuditSnapshot.slice(0, 1200)}
Open insights: ${ctx.openInsightTitles.join("; ") || "none"}
Recommendations: ${ctx.recommendationTitles.join("; ") || "none"}
Reviews: ${ctx.reviewSummary}
${holidayLine}

Return JSON:
{
  "revenueHealthLine": "one plain sentence on online consistency (reviews, hours, photos)—no jargon",
  "needToKnow": ["max 4 critical bullets"],
  "suggestions": ["max 5 short chips"],
  "aiTasks": [{"title","detail","category","impactLabel","estimatedMinutes","confidenceScore","requiresIntegration?"}]
}
Include 2-4 aiTasks. Mark requiresIntegration when Instagram/email not connected.`;

  const res = await geminiJsonCompletion({ system, user, temperature: 0.55 });
  if (!res.ok) return [];

  const raw = res.raw;

  try {
    const parsed = morningBriefAiSchema.parse(JSON.parse(raw));
    return parsed.aiTasks.map((t) => ({
      title: t.title,
      detail: t.detail,
      category: t.category,
      source: "AI" as const,
      impactLabel: t.impactLabel,
      estimatedMinutes: t.estimatedMinutes,
      confidenceScore: t.confidenceScore,
      requiresIntegration: t.requiresIntegration,
    }));
  } catch {
    return [];
  }
}

function mergeTasks(auditTasks: TaskDraftInput[], aiTasks: TaskDraftInput[]): TaskDraftInput[] {
  const seen = new Set<string>();
  const out: TaskDraftInput[] = [];
  for (const t of [...auditTasks, ...aiTasks]) {
    const key = t.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out.slice(0, 14);
}

export type GenerateMorningBriefResult = {
  greeting: string;
  summary: TodayBriefSummary;
  taskDrafts: TaskDraftInput[];
};

export async function generateMorningBrief(restaurantId: string): Promise<GenerateMorningBriefResult | null> {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) return null;

  const ctx = await buildGrowthAgentBriefingContext(restaurantId);
  if (!ctx) return null;

  const auditTasks = await buildAuditTasksForRestaurant(restaurantId);
  const linkedAudit = await fetchLatestLinkedAudit(restaurantId);
  const auditPayload = linkedAudit ? parseAuditPayload(linkedAudit.resultPayload) : null;
  const perception = auditPayload?.perceptionAuditV1;
  const ownerHero = perception?.ownerHero ?? (perception && auditPayload ? buildOwnerHeroFallback(auditPayload, perception) : null);
  const competitors = auditPayload?.competitors?.map((c) => c.name) ?? [];

  const holiday = nextUkHoliday();
  const holidayLine = holiday
    ? `Next UK event: ${holiday.event.name} in ${holiday.daysAway} days.`
    : "No imminent UK holiday.";

  let aiMeta = {
    revenueHealthLine: ctx.city
      ? `${ctx.name} in ${ctx.city} — focus on the high-impact fixes below.`
      : `${ctx.name} — focus on the high-impact fixes below.`,
    needToKnow: [] as string[],
    suggestions: [] as string[],
  };

  let aiTasks = ruleBasedAiTasks(ctx, holiday?.event.name ?? null, holiday?.daysAway ?? null, competitors);

  if (isGeminiConfigured()) {
    try {
      const apiKeyTasks = await callMorningBriefAi(ctx, restaurant.aiPersonality, holidayLine);
      if (apiKeyTasks.length) aiTasks = apiKeyTasks;

      const metaRes = await geminiJsonCompletion({
        system: "Return JSON only.",
        user: `For ${ctx.name}: ${holidayLine} Audit: ${ctx.latestLinkedAuditSnapshot.slice(0, 800)}. Return {"revenueHealthLine","needToKnow":[],"suggestions":[]}`,
        temperature: 0.5,
      });
      if (metaRes.ok) {
        const m = morningBriefAiSchema.pick({ revenueHealthLine: true, needToKnow: true, suggestions: true }).safeParse(JSON.parse(metaRes.raw));
        if (m.success) aiMeta = m.data;
      }
    } catch {
      /* fallback to rule-based */
    }
  }

  if (holiday && holiday.daysAway <= 21) {
    aiMeta.needToKnow.unshift(`${holiday.event.name} is ${holiday.daysAway} days away.`);
  }

  // Live signals from connected calendar + inbox (cached snapshots, no network).
  let greeting = greetingForHour(restaurant.name);
  try {
    const [calendarEvents, gmail] = await Promise.all([
      getCalendarSnapshot(restaurantId),
      getGmailSnapshot(restaurantId),
    ]);

    const today = todaysEvents(calendarEvents);
    if (today.length) {
      const first = today[0];
      const eventLine = first.allDay
        ? `Today: ${first.title}.`
        : `You have ${first.title} at ${formatEventTime(first.start)}${today.length > 1 ? ` and ${today.length - 1} more event${today.length > 2 ? "s" : ""} today` : ""}.`;
      greeting = `${greeting} ${eventLine}`;
      aiMeta.needToKnow.unshift(eventLine);
    }

    if (gmail && gmail.unreadCount > 0) {
      aiMeta.needToKnow.push(
        `${gmail.unreadCount} unread email${gmail.unreadCount === 1 ? "" : "s"} in the last 24h — want replies drafted? Type it in the task bar.`,
      );
    }
  } catch {
    /* signals are best-effort */
  }

  if (ctx.visibilityScore != null && ctx.visibilityScore < 50) {
    aiMeta.needToKnow.push(`Digital positioning score is ${ctx.visibilityScore}/100 — guests may be choosing competitors online.`);
  }

  const merged = mergeTasks(auditTasks, aiTasks);
  const totalMinutes = merged.reduce((s, t) => s + (t.estimatedMinutes ?? 5), 0);

  let revenueLow: number | null = null;
  let revenueHigh: number | null = null;
  for (const t of auditTasks) {
    if (t.revenueLowGbp != null) revenueLow = t.revenueLowGbp;
    if (t.revenueHighGbp != null) revenueHigh = t.revenueHighGbp;
  }

  const holidayTasks = merged.filter((t) => t.category === "HOLIDAY");

  const summary: TodayBriefSummary = {
    revenueHealthLine: aiMeta.revenueHealthLine,
    revenueHeadline: ownerHero?.revenueHeadline ?? null,
    taskCount: merged.length,
    totalMinutes,
    revenueOpportunityLow: revenueLow,
    revenueOpportunityHigh: revenueHigh,
    needToKnow: aiMeta.needToKnow.slice(0, 5),
    suggestions: aiMeta.suggestions.slice(0, 6),
    holidayBlock: holiday
      ? {
          eventName: holiday.event.name,
          daysAway: holiday.daysAway,
          emailPrepared: holidayTasks.some((t) => Boolean(t.draftPayload)),
          instagramPrepared: holidayTasks.some((t) => Boolean(t.draftPayload)),
          bannerPrepared: false,
        }
      : null,
  };

  return {
    greeting,
    summary,
    taskDrafts: merged,
  };
}
