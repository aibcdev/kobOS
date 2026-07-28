import {
  buildDecisionJourneyReport,
  type DecisionJourneyReport,
} from "@/lib/audit/decision-journey";
import { parseAuditPayload } from "@/lib/audit/types";
import { prisma } from "@/lib/db/prisma";

export type TodayJourneySnapshot = {
  auditId: string;
  auditSlug: string | null;
  overallScore: number | null;
  designScore: number | null;
  websiteUrl: string | null;
  report: DecisionJourneyReport;
};

export async function loadTodayJourneySnapshot(
  restaurantId: string,
  restaurantName: string,
  city: string | null,
  website: string | null,
): Promise<TodayJourneySnapshot | null> {
  const audit = await prisma.visibilityAudit.findFirst({
    where: { restaurantId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      restaurantName: true,
      city: true,
      websiteUrl: true,
      overallScore: true,
      designScore: true,
      resultPayload: true,
    },
  });

  if (!audit?.resultPayload) return null;
  const payload = parseAuditPayload(audit.resultPayload);
  if (!payload) return null;

  const report = buildDecisionJourneyReport(payload, {
    restaurantName: audit.restaurantName || restaurantName,
    city: audit.city || city || "",
    websiteUrl: audit.websiteUrl || website,
  });

  return {
    auditId: audit.id,
    auditSlug: audit.slug,
    overallScore: audit.overallScore,
    designScore: audit.designScore,
    websiteUrl: audit.websiteUrl || website,
    report,
  };
}
