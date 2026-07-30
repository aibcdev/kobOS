import {
  computeAuditOpportunityReport,
  ensureMoneyFirstOpportunityReport,
} from "@/lib/audit/audit-opportunity-from-payload";
import {
  buildDecisionJourneyReport,
  type DecisionJourneyReport,
} from "@/lib/audit/decision-journey";
import { parseAuditPayload } from "@/lib/audit/types";
import { prisma } from "@/lib/db/prisma";

/**
 * A fix straight out of the owner's audit report — same title, same detail, same
 * customer number they already saw there. `customersPerMonth` is null when the
 * audit never produced a lost-customer estimate; we show no number rather than a guess.
 */
export type TodayAuditFix = {
  title: string;
  detail: string;
  customersPerMonth: number | null;
};

export type TodayJourneySnapshot = {
  auditId: string;
  auditSlug: string | null;
  overallScore: number | null;
  designScore: number | null;
  websiteUrl: string | null;
  /** Modelled monthly lost customers from the audit, or null if it was never estimated. */
  estMonthlyLostCustomers: number | null;
  topFixes: TodayAuditFix[];
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

  const opportunity = ensureMoneyFirstOpportunityReport(
    payload.opportunityReport ??
      computeAuditOpportunityReport(payload, {
        name: audit.restaurantName || restaurantName,
        city: audit.city || city || "",
        websiteUrl: audit.websiteUrl || website,
      }),
    payload,
  );

  const lostCustomers = opportunity.opportunity_score?.est_monthly_lost_customers ?? null;
  const hasLostEstimate = typeof lostCustomers === "number" && lostCustomers > 0;

  return {
    auditId: audit.id,
    auditSlug: audit.slug,
    overallScore: audit.overallScore,
    designScore: audit.designScore,
    websiteUrl: audit.websiteUrl || website,
    estMonthlyLostCustomers: hasLostEstimate ? lostCustomers : null,
    topFixes: opportunity.topFixes.slice(0, 3).map((f) => ({
      title: f.title,
      detail: f.detail,
      customersPerMonth: hasLostEstimate ? f.customersPerMonth : null,
    })),
    report,
  };
}
