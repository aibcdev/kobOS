import { prisma } from "@/lib/db/prisma";
import { utcDay } from "@/lib/marketing/visits";

export type RecentActivity = {
  hours: number;
  since: string;
  /** Visit counts are per UTC day, so they start at midnight UTC on the first day of the window. */
  visitsSinceDay: string;
  visits: {
    views: number;
    entries: number;
    topPages: { path: string; views: number }[];
    topSources: { source: string; entries: number }[];
  };
  audits: { visitor: number; outbound: number; internal: number; unknown: number };
  auditEmails: number;
  newAccounts: number;
  trialsStarted: number;
};

const AUDIT_ORIGINS = ["visitor", "outbound", "internal"] as const;

/** Real visitors vs KOB's own outbound work over the last `hours`. Read-only. */
export async function loadRecentActivity(hours = 48, now: Date = new Date()): Promise<RecentActivity> {
  const since = new Date(now.getTime() - hours * 60 * 60 * 1000);
  const fromDay = utcDay(since);

  const [visitTotals, pages, sources, auditGroups, auditEmails, newAccounts, trialsStarted] = await Promise.all([
    prisma.siteVisitDay.aggregate({ where: { day: { gte: fromDay } }, _sum: { views: true, entries: true } }),
    prisma.siteVisitDay.groupBy({
      by: ["path"],
      where: { day: { gte: fromDay } },
      _sum: { views: true },
      orderBy: { _sum: { views: "desc" } },
      take: 10,
    }),
    prisma.siteVisitDay.groupBy({
      by: ["source"],
      where: { day: { gte: fromDay }, entries: { gt: 0 } },
      _sum: { entries: true },
      orderBy: { _sum: { entries: "desc" } },
      take: 10,
    }),
    prisma.visibilityAudit.groupBy({ by: ["origin"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.visibilityAudit.count({ where: { leadCapturedAt: { gte: since } } }),
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.restaurant.count({ where: { trialStartedAt: { gte: since } } }),
  ]);

  const audits = { visitor: 0, outbound: 0, internal: 0, unknown: 0 };
  for (const g of auditGroups) {
    const key = AUDIT_ORIGINS.find((o) => o === g.origin) ?? "unknown";
    audits[key] += g._count._all;
  }

  return {
    hours,
    since: since.toISOString(),
    visitsSinceDay: fromDay.toISOString().slice(0, 10),
    visits: {
      views: visitTotals._sum.views ?? 0,
      entries: visitTotals._sum.entries ?? 0,
      topPages: pages.map((p) => ({ path: p.path, views: p._sum.views ?? 0 })),
      topSources: sources.map((s) => ({ source: s.source, entries: s._sum.entries ?? 0 })),
    },
    audits,
    auditEmails,
    newAccounts,
    trialsStarted,
  };
}
