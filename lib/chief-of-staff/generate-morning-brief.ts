import type { AiPersonality } from "@prisma/client";
import { geminiJsonCompletion, isGeminiConfigured } from "@/lib/ai/gemini-config";
import { buildAuditTasksForRestaurant, fetchLatestLinkedAudit } from "@/lib/chief-of-staff/build-audit-tasks";
import { morningBriefAiSchema } from "@/lib/chief-of-staff/morning-brief-schema";
import type { TaskDraftInput, TodayBriefSummary } from "@/lib/chief-of-staff/types";
import { buildOwnerHeroFallback } from "@/lib/audit/build-owner-hero";
import { parseAuditPayload } from "@/lib/audit/types";
import { buildGrowthAgentBriefingContext } from "@/lib/growth-agent/restaurant-context";
import { getCalendarSnapshot, type CalendarEventSnapshot } from "@/lib/integrations/providers/google-calendar";
import { getGmailSnapshot } from "@/lib/integrations/providers/gmail";
import { prisma } from "@/lib/db/prisma";
import { localDay, pendingApprovals } from "@/lib/kob/talk/restaurant-facts";
import { formatLocalDate, nextLocalEvent } from "@/lib/locale/holidays";
import { nightsProfile, WEEKDAY_NAME } from "@/lib/venue/nights";

function greetingForHour(name: string, timezone: string, now: Date): string {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: timezone }).format(now));
  const part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${part}, ${name}.`;
}

/** Events still to come today in the restaurant's local day. */
function todaysEvents(events: CalendarEventSnapshot[], timezone: string, now: Date): CalendarEventSnapshot[] {
  const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(d);
  return events.filter((e) => {
    const start = new Date(e.start);
    return start >= now && day(start) === day(now);
  });
}

function formatEventTime(iso: string, timezone: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", timeZone: timezone });
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

/**
 * Tasks from what KOB actually knows about this restaurant today: unanswered reviews, nights it doesn't know yet,
 * and the next local date worth planning for. No generic filler.
 */
async function factTasks(
  restaurant: { id: string; name: string; countryCode: string | null; timezone: string },
  today: string,
  now: Date,
): Promise<{ tasks: TaskDraftInput[]; needToKnow: string[]; event: ReturnType<typeof nextLocalEvent> }> {
  const tasks: TaskDraftInput[] = [];
  const needToKnow: string[] = [];

  // Reviews: replies already drafted wait in Needs you; unanswered ones without a draft become tasks.
  const { approvals } = await pendingApprovals(restaurant.id);
  const replyKeys = new Set(
    (await prisma.osAction.findMany({ where: { restaurantId: restaurant.id, actionType: "gbp.review.reply", status: { in: ["AWAITING_APPROVAL", "APPROVED", "EXECUTING", "EXECUTED", "VERIFYING"] } }, select: { taskKey: true } })).map((a) => a.taskKey),
  );
  const replies = approvals.filter((a) => a.kind === "gbp.review.reply").length;
  if (replies) needToKnow.push(`${replies} review repl${replies === 1 ? "y is" : "ies are"} drafted and waiting for your yes.`);
  const unanswered = await prisma.customerReview.findMany({
    where: { restaurantId: restaurant.id, replied: false, reviewedAt: { gte: new Date(now.getTime() - 14 * 86_400_000) } },
    orderBy: [{ rating: "asc" }, { reviewedAt: "desc" }],
    take: 6,
  });
  for (const r of unanswered.filter((r) => !r.externalReviewId || !replyKeys.has(`gbp-review:${r.externalReviewId}`)).slice(0, 2)) {
    const who = r.reviewerName?.trim().split(/\s+/)[0] ?? "a guest";
    tasks.push({
      title: `Reply to ${who}'s ${r.rating}-star review`,
      detail: r.body ? `"${r.body.slice(0, 140)}"` : "Rating only, no comment.",
      category: "REVIEWS",
      source: "ENGINE",
      impactLabel: r.rating <= 2 ? "Protect your rating" : "Thank a happy guest",
      estimatedMinutes: 2,
      confidenceScore: 90,
    });
  }
  const newSinceYesterday = await prisma.customerReview.count({ where: { restaurantId: restaurant.id, reviewedAt: { gte: new Date(now.getTime() - 86_400_000) } } });
  if (newSinceYesterday) needToKnow.unshift(`${newSinceYesterday} new review${newSinceYesterday === 1 ? "" : "s"} since yesterday.`);

  // Quiet nights: offers only go where they help. Unknown → ask once.
  const nights = await nightsProfile(restaurant.id, now);
  if (nights.source === "unknown")
    tasks.push({
      title: `Which nights are quiet at ${restaurant.name}?`,
      detail: `Tell KOB in Talk — for example "Tuesdays are quiet, Fridays are busy" — and offers will only ever go to the quiet ones.`,
      category: "OPERATIONS",
      source: "ENGINE",
      estimatedMinutes: 1,
      confidenceScore: 85,
    });
  else if (nights.quiet.length) {
    const offers = await prisma.demandRecommendation.count({ where: { restaurantId: restaurant.id, status: "PENDING" } });
    if (offers) needToKnow.push(`${offers} offer idea${offers === 1 ? "" : "s"} for quiet ${nights.quiet.map((d) => `${WEEKDAY_NAME[d]}s`).join(" and ")} waiting in Offers.`);
  }

  // The next date this restaurant's guests plan around.
  const event = nextLocalEvent(restaurant.countryCode, today, 21);
  if (event)
    tasks.push({
      title: `Plan for ${event.name} (${event.daysAway === 0 ? "today" : `${event.daysAway} day${event.daysAway === 1 ? "" : "s"} away`})`,
      detail: `${event.name} is ${formatLocalDate(event.date)}. Approve and KOB drafts a post and an offer for you to check.`,
      category: "HOLIDAY",
      source: "ENGINE",
      impactLabel: "Seasonal bookings",
      estimatedMinutes: 3,
      confidenceScore: 82,
    });
  return { tasks, needToKnow, event };
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

export async function generateMorningBrief(restaurantId: string, opts: { now?: Date } = {}): Promise<GenerateMorningBriefResult | null> {
  const now = opts.now ?? new Date();
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) return null;

  const ctx = await buildGrowthAgentBriefingContext(restaurantId);
  if (!ctx) return null;

  const auditTasks = await buildAuditTasksForRestaurant(restaurantId);
  const linkedAudit = await fetchLatestLinkedAudit(restaurantId);
  const auditPayload = linkedAudit ? parseAuditPayload(linkedAudit.resultPayload) : null;
  const perception = auditPayload?.perceptionAuditV1;
  const ownerHero = perception?.ownerHero ?? (perception && auditPayload ? buildOwnerHeroFallback(auditPayload, perception) : null);

  const { date: today } = localDay(restaurant.timezone, now);
  const facts = await factTasks(restaurant, today, now);
  const holiday = facts.event;
  const place = [ctx.city, restaurant.countryCode].filter(Boolean).join(", ");

  let aiMeta = {
    revenueHealthLine: ctx.city
      ? `${ctx.name} in ${ctx.city} — here's what needs you today.`
      : `${ctx.name} — here's what needs you today.`,
    needToKnow: [...facts.needToKnow],
    suggestions: [] as string[],
  };

  // The language service may only reword the summary; tasks come from the restaurant's own facts.
  if (isGeminiConfigured()) {
    try {
      const metaRes = await geminiJsonCompletion({
        system: `You write one plain sentence for the owner of an independent restaurant in ${place || "their town"}. Tone: ${personalityTone(restaurant.aiPersonality)}. Never invent numbers, money, guests or events. Never mention AI, automation, bots or agents. Return JSON only.`,
        user: `Facts for ${ctx.name} today: ${facts.needToKnow.join(" ") || "nothing urgent"}. ${holiday ? `${holiday.name} is ${holiday.daysAway} days away.` : ""} Return {"revenueHealthLine": "<one sentence>"}`,
        temperature: 0.4,
      });
      if (metaRes.ok) {
        const m = morningBriefAiSchema.pick({ revenueHealthLine: true }).safeParse(JSON.parse(metaRes.raw));
        if (m.success) aiMeta = { ...aiMeta, revenueHealthLine: m.data.revenueHealthLine };
      }
    } catch {
      /* keep the plain line */
    }
  }

  // Live signals from connected calendar + inbox (cached snapshots, no network).
  let greeting = greetingForHour(restaurant.name, restaurant.timezone, now);
  try {
    const [calendarEvents, gmail] = await Promise.all([
      getCalendarSnapshot(restaurantId),
      getGmailSnapshot(restaurantId),
    ]);

    const upcoming = todaysEvents(calendarEvents, restaurant.timezone, now);
    if (upcoming.length) {
      const first = upcoming[0];
      const eventLine = first.allDay
        ? `Today: ${first.title}.`
        : `You have ${first.title} at ${formatEventTime(first.start, restaurant.timezone)}${upcoming.length > 1 ? ` and ${upcoming.length - 1} more event${upcoming.length > 2 ? "s" : ""} today` : ""}.`;
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
    aiMeta.needToKnow.push(
      `Digital positioning score is ${ctx.visibilityScore}/100 — tighten the highest-impact fixes below.`,
    );
  }

  const merged = mergeTasks(facts.tasks, auditTasks);
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
          eventName: holiday.name,
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
