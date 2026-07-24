import { getLeadEngineConfig } from "@/lib/lead-engine/config";
import { passesHighStreetRestaurantIcp } from "@/lib/lead-engine/high-street-icp";
import { isExcludedFromOutboundIcp } from "@/lib/outbound/chain-denylist";
import { ensureOutboundAudit } from "@/lib/outbound/ensure-outbound-audit";
import { generateOutboundAbEmail } from "@/lib/outbound/generate-uk-cold-draft";
import { isValidProspectEmail } from "@/lib/outbound/validate-prospect-email";
import { LeadProspectStatus, OutboundLeadSource, OutboundLeadStatus, type LeadProspect } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type OutreachWriterResult = {
  processed: number;
  queued: number;
  skipped: Record<string, number>;
};

export async function runOutreachWriter(
  workspaceRestaurantId: string,
  options?: { max?: number; prospectIds?: string[] },
): Promise<OutreachWriterResult> {
  const config = getLeadEngineConfig();
  const max = options?.max ?? config.outreachDailyCap;
  const skipped: Record<string, number> = {};
  const bump = (key: string) => {
    skipped[key] = (skipped[key] ?? 0) + 1;
  };

  const where = options?.prospectIds?.length
    ? { id: { in: options.prospectIds }, workspaceRestaurantId }
    : {
        workspaceRestaurantId,
        status: LeadProspectStatus.ANALYZED,
        contactEmail: { not: null },
        outboundLeadId: null,
        kobOpportunityScore: { gte: config.minScoreForOutreach },
      };

  const prospects = await prisma.leadProspect.findMany({
    where,
    orderBy: [{ kobOpportunityScore: "desc" }, { createdAt: "asc" }],
    take: max,
  });

  let queued = 0;

  for (const prospect of prospects) {
    const result = await queueProspectOutreach(workspaceRestaurantId, prospect);
    if (result === "queued") queued++;
    else bump(result);
  }

  return { processed: prospects.length, queued, skipped };
}

export async function queueProspectOutreach(
  workspaceRestaurantId: string,
  prospect: LeadProspect,
): Promise<"queued" | string> {
  const config = getLeadEngineConfig();

  if (!prospect.contactEmail) return "no_email";
  if (!prospect.websiteUrl?.trim()) return "no_website";
  if (prospect.outboundLeadId) return "already_queued";
  if (isExcludedFromOutboundIcp(prospect.name, prospect.websiteUrl)) return "chain_or_elite";
  if (!isValidProspectEmail(prospect.contactEmail, prospect.websiteUrl).ok) return "invalid_email";

  const hs = passesHighStreetRestaurantIcp({
    name: prospect.name,
    websiteUrl: prospect.websiteUrl,
    reviewCount: prospect.reviewCount,
    googleReviewMin: config.googleReviewMin,
    lastReviewAt: prospect.lastReviewAt,
    instagramUrl: prospect.instagramUrl,
    instagramPostGapDays: prospect.instagramPostGapDays,
    businessType: prospect.businessType,
    deliveryPlatforms: prospect.deliveryPlatforms,
    hasOnlineOrdering: prospect.hasOnlineOrdering,
  });
  if (!hs.ok) return hs.reason;

  if ((prospect.kobOpportunityScore ?? 0) < config.minScoreForOutreach) return "score_too_low";
  if (prospect.disqualifiers.length > 0) return "disqualified";
  if (prospect.locationCount == null || prospect.locationCount < 1 || prospect.locationCount > config.locationMax) {
    return "too_many_locations";
  }

  const auditResult = await ensureOutboundAudit({
    restaurantName: prospect.name,
    city: prospect.city,
    websiteUrl: prospect.websiteUrl,
    placeId: prospect.placeId,
    formattedAddress: prospect.formattedAddress,
    contactEmail: prospect.contactEmail,
    existingAuditId: prospect.visibilityAuditId,
  });
  if ("ok" in auditResult && auditResult.ok === false) {
    return auditResult.error;
  }
  if (!("auditId" in auditResult)) return "audit_failed";

  const oppCount = prospect.opportunities.length || 1;
  const insightSummary = `Lead engine · KOB score ${prospect.kobOpportunityScore}/100 · ${oppCount} opportunities · variant pending`;

  const outboundLead = await prisma.outboundLead.create({
    data: {
      workspaceRestaurantId,
      placeId: prospect.placeId,
      city: prospect.city,
      restaurantName: prospect.name,
      websiteUrl: prospect.websiteUrl,
      contactEmail: prospect.contactEmail,
      insightSummary,
      messageSubject: "",
      messageBody: "",
      suggestedTone: "",
      status: OutboundLeadStatus.PENDING_APPROVAL,
      source: OutboundLeadSource.LEAD_ENGINE,
      qualifyScore: prospect.kobOpportunityScore,
      reviewCount: prospect.reviewCount,
      enrichmentSource: prospect.enrichmentSource,
      visibilityAuditId: auditResult.auditId,
      auditUrl: auditResult.auditUrl,
    },
  });

  const draft = generateOutboundAbEmail({
    stableId: outboundLead.id,
    companyName: prospect.name,
    auditUrl: auditResult.auditUrl,
  });

  await prisma.outboundLead.update({
    where: { id: outboundLead.id },
    data: {
      emailVariant: draft.variant,
      messageSubject: draft.email_subject,
      messageBody: draft.message_body,
      suggestedTone: draft.suggested_tone,
      insightSummary: `Lead engine · KOB score ${prospect.kobOpportunityScore}/100 · email ${draft.variant} · ${auditResult.slug}`,
    },
  });

  await prisma.leadProspect.update({
    where: { id: prospect.id },
    data: {
      status: LeadProspectStatus.QUEUED,
      outboundLeadId: outboundLead.id,
      visibilityAuditId: auditResult.auditId,
    },
  });

  return "queued";
}
