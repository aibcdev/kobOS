import { getLeadEngineConfig } from "@/lib/lead-engine/config";
import { generateLeadEngineDraft } from "@/lib/outbound/generate-uk-cold-draft";
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
  if (prospect.outboundLeadId) return "already_queued";
  if ((prospect.kobOpportunityScore ?? 0) < config.minScoreForOutreach) return "score_too_low";
  if (prospect.disqualifiers.length > 0) return "disqualified";

  const draftResult = await generateLeadEngineDraft({
    restaurantName: prospect.name,
    city: prospect.city,
    websiteUrl: prospect.websiteUrl ?? "",
    kobOpportunityScore: prospect.kobOpportunityScore ?? 0,
    opportunities: prospect.opportunities,
    reviewCount: prospect.reviewCount,
    rating: prospect.rating,
  });

  if (!draftResult.ok) return "draft_failed";

  const oppCount = prospect.opportunities.length || 1;
  const insightSummary = `Lead engine · KOB score ${prospect.kobOpportunityScore}/100 · ${oppCount} opportunities`;

  const outboundLead = await prisma.outboundLead.create({
    data: {
      workspaceRestaurantId,
      placeId: prospect.placeId,
      city: prospect.city,
      restaurantName: prospect.name,
      websiteUrl: prospect.websiteUrl,
      contactEmail: prospect.contactEmail,
      insightSummary,
      messageSubject: draftResult.draft.email_subject,
      messageBody: draftResult.draft.message_body,
      suggestedTone: draftResult.draft.suggested_tone,
      status: OutboundLeadStatus.PENDING_APPROVAL,
      source: OutboundLeadSource.LEAD_ENGINE,
      qualifyScore: prospect.kobOpportunityScore,
      reviewCount: prospect.reviewCount,
      enrichmentSource: prospect.enrichmentSource,
    },
  });

  await prisma.leadProspect.update({
    where: { id: prospect.id },
    data: {
      status: LeadProspectStatus.QUEUED,
      outboundLeadId: outboundLead.id,
    },
  });

  return "queued";
}
