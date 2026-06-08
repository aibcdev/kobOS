import type { TaskCategory } from "@prisma/client";
import { buildOwnerHeroFallback } from "@/lib/audit/build-owner-hero";
import { parseAuditPayload } from "@/lib/audit/types";
import type { TaskDraftInput } from "@/lib/chief-of-staff/types";
import { prisma } from "@/lib/db/prisma";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

export async function fetchLatestLinkedAudit(restaurantId: string) {
  return prisma.visibilityAudit.findFirst({
    where: { restaurantId },
    orderBy: { updatedAt: "desc" },
  });
}

export function buildAuditTasksFromPayload(
  auditId: string,
  rawPayload: unknown,
): TaskDraftInput[] {
  const payload = parseAuditPayload(rawPayload);
  if (!payload) return [];

  const tasks: TaskDraftInput[] = [];
  const perception = payload.perceptionAuditV1;
  const hero = perception?.ownerHero ?? (perception ? buildOwnerHeroFallback(payload, perception) : null);

  if (perception?.revenueLeaks?.length) {
    for (const leak of perception.revenueLeaks.slice(0, 4)) {
      tasks.push({
        title: leak.title,
        detail: leak.narrative.slice(0, 280),
        category: "OPERATIONS",
        source: "AUDIT",
        impactLabel: leak.impact === "high" ? "High revenue impact" : "Medium impact",
        estimatedMinutes: leak.impact === "high" ? 8 : 5,
        confidenceScore: perception.confidence === "high" ? 92 : perception.confidence === "medium" ? 82 : 70,
        revenueLowGbp: hero?.monthlyRevenueBandLowGbp,
        revenueHighGbp: hero?.monthlyRevenueBandHighGbp,
        auditId,
      });
    }
  }

  if (hero) {
    tasks.push({
      title: `Address ${hero.bookingLeakPercentLow}–${hero.bookingLeakPercentHigh}% booking leak`,
      detail: hero.revenueHeadline,
      category: "OPERATIONS",
      source: "AUDIT",
      impactLabel:
        hero.monthlyRevenueBandLowGbp && hero.monthlyRevenueBandHighGbp
          ? `£${hero.monthlyRevenueBandLowGbp}–£${hero.monthlyRevenueBandHighGbp}/mo`
          : "Revenue opportunity",
      estimatedMinutes: 10,
      confidenceScore: 88,
      revenueLowGbp: hero.monthlyRevenueBandLowGbp,
      revenueHighGbp: hero.monthlyRevenueBandHighGbp,
      auditId,
    });
  }

  for (const row of perception?.visualScorecard?.filter((r) => r.scoreOutOf10 < 6).slice(0, 2) ?? []) {
    tasks.push({
      title: `Improve ${row.category.toLowerCase()}`,
      detail: row.note,
      category: "CONTENT",
      source: "AUDIT",
      impactLabel: "Guest perception",
      estimatedMinutes: 6,
      confidenceScore: 80,
      auditId,
    });
  }

  for (const c of payload.competitors.slice(0, 2)) {
    tasks.push({
      title: `Review how ${c.name} compares locally`,
      detail: c.note.slice(0, 200),
      category: "COMPETITOR",
      source: "AUDIT",
      impactLabel: "Competitive gap",
      estimatedMinutes: 4,
      confidenceScore: 78,
      auditId,
    });
  }

  const gp = payload.evidencePack?.googlePlace;
  if (gp?.reviews?.length) {
    tasks.push({
      title: `Reply to ${Math.min(gp.reviews.length, 5)} Google reviews`,
      detail: "Recent guest feedback is visible on your profile — timely replies build trust.",
      category: "REVIEWS",
      source: "AUDIT",
      impactLabel: gp.rating != null ? `${gp.rating.toFixed(1)}★ profile` : "Reputation",
      estimatedMinutes: clamp(gp.reviews.length * 2, 3, 12),
      confidenceScore: 85,
      auditId,
    });
  }

  if (payload.scores?.mobile != null && payload.scores.mobile < 60) {
    tasks.push({
      title: "Fix mobile experience on your website",
      detail: "Your audit flagged weak mobile UX — most guests decide on their phone.",
      category: "SEO",
      source: "AUDIT",
      impactLabel: "Conversion",
      estimatedMinutes: 15,
      confidenceScore: 84,
      auditId,
    });
  }

  return dedupeTasks(tasks);
}

export async function buildAuditTasksForRestaurant(restaurantId: string): Promise<TaskDraftInput[]> {
  const audit = await fetchLatestLinkedAudit(restaurantId);
  if (!audit) return [];
  return buildAuditTasksFromPayload(audit.id, audit.resultPayload);
}

function dedupeTasks(tasks: TaskDraftInput[]): TaskDraftInput[] {
  const seen = new Set<string>();
  const out: TaskDraftInput[] = [];
  for (const t of tasks) {
    const key = t.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export function categoryFromRecommendationType(type: string): TaskCategory {
  const map: Record<string, TaskCategory> = {
    CREATE_BLOG: "SEO",
    GENERATE_SEO_PAGE: "SEO",
    POST_SOCIAL: "SOCIAL",
    CREATE_CAMPAIGN: "HOLIDAY",
    SEND_EMAIL: "EMAIL",
    UPDATE_HOMEPAGE: "CONTENT",
    RUN_PROMOTION: "HOLIDAY",
    OPTIMIZE_MENU: "MENU",
  };
  return map[type] ?? "OPERATIONS";
}
