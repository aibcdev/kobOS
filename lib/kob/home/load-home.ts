import { parseAuditPayload } from "@/lib/audit/types";
import { fetchLatestLinkedAudit } from "@/lib/chief-of-staff/build-audit-tasks";
import { getCachedTodayBrief } from "@/lib/chief-of-staff/ensure-today-brief";
import type { TodayBriefPayload } from "@/lib/chief-of-staff/types";
import { linkLatestAuditForEmail } from "@/lib/restaurant/hydrate-from-audit";

export type HomeAudit = {
  id: string;
  href: string;
  score: number;
  checkedAt: string;
  fixCount: number;
};

export type HomeData = {
  audit: HomeAudit | null;
  /** Null when today's brief hasn't been generated yet; the client asks for it. */
  brief: TodayBriefPayload | null;
};

/** DB-only so the first paint after login never waits on Gemini. */
export async function loadHomeData(restaurantId: string, userEmail: string | null): Promise<HomeData> {
  let audit = await fetchLatestLinkedAudit(restaurantId);
  if (!audit && userEmail) {
    const linkedId = await linkLatestAuditForEmail(restaurantId, userEmail).catch(() => null);
    if (linkedId) audit = await fetchLatestLinkedAudit(restaurantId);
  }

  const brief = await getCachedTodayBrief(restaurantId).catch(() => null);
  if (!audit) return { audit: null, brief };

  const payload = parseAuditPayload(audit.resultPayload);
  return {
    audit: {
      id: audit.id,
      href: `/audit/${encodeURIComponent(audit.slug ?? audit.id)}`,
      score: Math.round(payload?.opportunityReport?.growthScore ?? audit.overallScore),
      checkedAt: audit.updatedAt.toISOString(),
      fixCount: payload?.opportunityReport?.topFixes?.length ?? 0,
    },
    brief,
  };
}
