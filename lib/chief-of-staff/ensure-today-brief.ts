import type { ChiefOfStaffTask, DailyBriefSnapshot } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { generateMorningBrief } from "@/lib/chief-of-staff/generate-morning-brief";
import type { ChiefOfStaffTaskDto, TodayBriefPayload } from "@/lib/chief-of-staff/types";
import { prisma } from "@/lib/db/prisma";

function todayUtcDate(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
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

export async function ensureTodayBrief(restaurantId: string, force = false): Promise<TodayBriefPayload> {
  const briefDate = todayUtcDate();
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { aiPersonality: true },
  });
  if (!restaurant) {
    throw new Error("restaurant_not_found");
  }

  const existing = await prisma.dailyBriefSnapshot.findUnique({
    where: { restaurantId_briefDate: { restaurantId, briefDate } },
  });

  if (existing && !force) {
    const tasks = await prisma.chiefOfStaffTask.findMany({
      where: {
        restaurantId,
        createdAt: { gte: existing.createdAt },
        status: { in: ["PENDING", "APPROVED"] },
      },
      orderBy: [{ status: "asc" }, { confidenceScore: "desc" }],
      take: 20,
    });
    if (tasks.length) {
      return snapshotToPayload(existing, tasks, restaurant.aiPersonality);
    }
  }

  const generated = await generateMorningBrief(restaurantId);
  if (!generated) {
    throw new Error("brief_generation_failed");
  }

  const snapshot = await prisma.$transaction(async (tx) => {
    await tx.chiefOfStaffTask.updateMany({
      where: { restaurantId, status: "PENDING" },
      data: { status: "DISMISSED" },
    });

    if (generated.taskDrafts.length) {
      await tx.chiefOfStaffTask.createMany({
        data: generated.taskDrafts.map((t) => ({
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
    where: { restaurantId, status: { in: ["PENDING", "APPROVED"] } },
    orderBy: [{ source: "asc" }, { confidenceScore: "desc" }],
    take: 20,
  });

  return snapshotToPayload(snapshot, tasks, restaurant.aiPersonality);
}

export async function getTodayBrief(restaurantId: string): Promise<TodayBriefPayload> {
  return ensureTodayBrief(restaurantId, false);
}
