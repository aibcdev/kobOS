import type { AiPersonality, ChiefOfStaffTask, DailyBriefSnapshot } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { generateMorningBrief } from "@/lib/chief-of-staff/generate-morning-brief";
import type { ChiefOfStaffTaskDto, TodayBriefPayload } from "@/lib/chief-of-staff/types";
import { shellTodayBriefWithJourney } from "@/lib/dashboard/journey-priorities";
import { prisma } from "@/lib/db/prisma";

/** The restaurant's own calendar day (as a @db.Date), so a Cape Town brief turns over at Cape Town midnight. */
async function localBriefDate(restaurantId: string, now: Date): Promise<Date> {
  const { timezone } = await prisma.restaurant.findUniqueOrThrow({ where: { id: restaurantId }, select: { timezone: true } });
  return new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(now)}T00:00:00Z`);
}

function toDraft(payload: ChiefOfStaffTask["draftPayload"]): ChiefOfStaffTaskDto["draft"] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const p = payload as Record<string, unknown>;
  if (typeof p.body !== "string" || !p.body.trim()) return null;
  const kinds = ["email", "social_post", "review_reply", "content", "note"] as const;
  const kind = kinds.includes(p.kind as (typeof kinds)[number]) ? (p.kind as (typeof kinds)[number]) : "note";
  return {
    kind,
    subject: typeof p.subject === "string" ? p.subject : null,
    body: p.body,
  };
}

function toDto(row: ChiefOfStaffTask): ChiefOfStaffTaskDto {
  return {
    id: row.id,
    title: row.title,
    detail: row.detail,
    category: row.category,
    source: row.source,
    status: row.status,
    impactLabel: row.impactLabel,
    estimatedMinutes: row.estimatedMinutes,
    confidenceScore: row.confidenceScore,
    revenueLowGbp: row.revenueLowGbp,
    revenueHighGbp: row.revenueHighGbp,
    requiresIntegration: row.requiresIntegration,
    auditId: row.auditId,
    conversationId: row.conversationId,
    draft: toDraft(row.draftPayload),
  };
}

function snapshotToPayload(
  snapshot: DailyBriefSnapshot,
  tasks: ChiefOfStaffTask[],
  aiPersonality: TodayBriefPayload["aiPersonality"],
): TodayBriefPayload {
  const summary = snapshot.summaryJson as TodayBriefPayload["summary"];
  return {
    greeting: snapshot.greeting,
    summary,
    tasks: tasks.map(toDto),
    aiPersonality,
    generatedAt: snapshot.updatedAt.toISOString(),
  };
}

/** Instant placeholder so dashboard SSR never waits on Gemini after login. */
export function shellTodayBrief(
  restaurantName: string,
  aiPersonality: AiPersonality = "BALANCED",
): TodayBriefPayload {
  return shellTodayBriefWithJourney(restaurantName, aiPersonality, null);
}

/** DB-only read — never calls Gemini. Used for fast post-login dashboard paint. */
export async function getCachedTodayBrief(restaurantId: string, now: Date = new Date()): Promise<TodayBriefPayload | null> {
  const briefDate = await localBriefDate(restaurantId, now).catch(() => null);
  if (!briefDate) return null;
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { aiPersonality: true },
  });
  if (!restaurant) return null;

  const existing = await prisma.dailyBriefSnapshot.findUnique({
    where: { restaurantId_briefDate: { restaurantId, briefDate } },
  });
  if (!existing) return null;

  const tasks = await prisma.chiefOfStaffTask.findMany({
    // Everything still open, plus what was approved today.
    where: { restaurantId, OR: [{ status: "PENDING" }, { status: "APPROVED", updatedAt: { gte: briefDate } }] },
    orderBy: [{ status: "asc" }, { confidenceScore: "desc" }],
    take: 20,
  });
  return snapshotToPayload(existing, tasks, restaurant.aiPersonality);
}

export async function ensureTodayBrief(restaurantId: string, force = false, now: Date = new Date()): Promise<TodayBriefPayload> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { aiPersonality: true },
  });
  if (!restaurant) {
    throw new Error("restaurant_not_found");
  }
  const briefDate = await localBriefDate(restaurantId, now);

  if (!force) {
    const cached = await getCachedTodayBrief(restaurantId, now);
    if (cached?.tasks.length) return cached;
  }

  const generated = await generateMorningBrief(restaurantId, { now });
  if (!generated) {
    throw new Error("brief_generation_failed");
  }

  const snapshot = await prisma.$transaction(async (tx) => {
    // Brief-made tasks (ENGINE, AUDIT, AI) are replaced, but one still on today's list stays as it is, so
    // regenerating never duplicates. Tasks from listing checks (draftPayload.listingIssue) or the owner are kept.
    const open = await tx.chiefOfStaffTask.findMany({
      where: { restaurantId, status: "PENDING", source: { in: ["ENGINE", "AUDIT", "AI"] } },
      select: { id: true, title: true, draftPayload: true },
    });
    const wanted = new Set(generated.taskDrafts.map((t) => t.title.toLowerCase()));
    const listingIssue = (p: unknown) => Boolean(p && typeof p === "object" && "listingIssue" in p);
    const stale = open.filter((t) => !wanted.has(t.title.toLowerCase()) && !listingIssue(t.draftPayload));
    if (stale.length) await tx.chiefOfStaffTask.updateMany({ where: { id: { in: stale.map((t) => t.id) } }, data: { status: "DISMISSED" } });
    const kept = new Set(open.filter((t) => wanted.has(t.title.toLowerCase())).map((t) => t.title.toLowerCase()));
    const fresh = generated.taskDrafts.filter((t) => !kept.has(t.title.toLowerCase()));

    if (fresh.length) {
      await tx.chiefOfStaffTask.createMany({
        data: fresh.map((t) => ({
          restaurantId,
          title: t.title,
          detail: t.detail ?? "",
          category: t.category,
          source: t.source,
          impactLabel: t.impactLabel,
          estimatedMinutes: t.estimatedMinutes ?? 5,
          confidenceScore: t.confidenceScore ?? 75,
          revenueLowGbp: t.revenueLowGbp,
          revenueHighGbp: t.revenueHighGbp,
          requiresIntegration: t.requiresIntegration,
          auditId: t.auditId,
          draftPayload: t.draftPayload ? (t.draftPayload as Prisma.InputJsonValue) : undefined,
        })),
      });
    }

    return tx.dailyBriefSnapshot.upsert({
      where: { restaurantId_briefDate: { restaurantId, briefDate } },
      create: {
        restaurantId,
        briefDate,
        greeting: generated.greeting,
        summaryJson: generated.summary,
      },
      update: {
        greeting: generated.greeting,
        summaryJson: generated.summary,
      },
    });
  });

  const tasks = await prisma.chiefOfStaffTask.findMany({
    where: { restaurantId, OR: [{ status: "PENDING" }, { status: "APPROVED", updatedAt: { gte: briefDate } }] },
    orderBy: [{ source: "asc" }, { confidenceScore: "desc" }],
    take: 20,
  });

  return snapshotToPayload(snapshot, tasks, restaurant.aiPersonality);
}

export async function getTodayBrief(restaurantId: string): Promise<TodayBriefPayload> {
  return ensureTodayBrief(restaurantId, false);
}
