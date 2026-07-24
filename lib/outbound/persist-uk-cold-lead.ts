import { OutboundLeadSource, OutboundLeadStatus, type OutboundEmailVariant } from "@prisma/client";
import { hostFromWebsiteUrl } from "@/lib/outbound/chain-denylist";
import type { UkColdQualifiedProspect } from "@/lib/outbound/prospect-types";
import { ensureOutboundAudit } from "@/lib/outbound/ensure-outbound-audit";
import { generateOutboundAbEmail } from "@/lib/outbound/generate-uk-cold-draft";
import { prisma } from "@/lib/db/prisma";

function normalizeWebsiteKey(url: string | null): string | null {
  const host = hostFromWebsiteUrl(url);
  return host || null;
}

export async function isUkColdLeadDuplicate(
  workspaceRestaurantId: string,
  websiteUrl: string | null,
  placeId: string,
): Promise<boolean> {
  const host = normalizeWebsiteKey(websiteUrl);
  const or: Array<{ placeId: string } | { websiteUrl: { contains: string; mode: "insensitive" } }> = [
    { placeId },
  ];
  if (host) {
    or.push({ websiteUrl: { contains: host, mode: "insensitive" } });
  }
  const existing = await prisma.outboundLead.findFirst({
    where: { workspaceRestaurantId, OR: or },
    select: { id: true },
  });
  return Boolean(existing);
}

export async function persistUkColdLead(
  workspaceRestaurantId: string,
  city: string,
  prospect: UkColdQualifiedProspect,
): Promise<{ ok: true; leadId: string; variant: OutboundEmailVariant } | { ok: false; reason: string }> {
  if (!prospect.websiteUrl?.trim()) {
    return { ok: false, reason: "no_website" };
  }

  const auditResult = await ensureOutboundAudit({
    restaurantName: prospect.name,
    city,
    websiteUrl: prospect.websiteUrl,
    placeId: prospect.placeId,
    contactEmail: prospect.contactEmail,
  });
  if ("ok" in auditResult && auditResult.ok === false) {
    return { ok: false, reason: auditResult.error };
  }
  if (!("auditId" in auditResult)) {
    return { ok: false, reason: "audit_failed" };
  }

  const lead = await prisma.outboundLead.create({
    data: {
      workspaceRestaurantId,
      placeId: prospect.placeId,
      city,
      restaurantName: prospect.name,
      websiteUrl: prospect.websiteUrl,
      contactEmail: prospect.contactEmail,
      insightSummary: `UK cold · score ${prospect.qualifyScore}/100 · ${prospect.topIssue}`,
      messageSubject: "",
      messageBody: "",
      suggestedTone: "",
      status: OutboundLeadStatus.PENDING_APPROVAL,
      source: OutboundLeadSource.UK_COLD,
      qualifyScore: prospect.qualifyScore,
      reviewCount: prospect.userRatingCount,
      enrichmentSource: prospect.enrichmentSource,
      visibilityAuditId: auditResult.auditId,
      auditUrl: auditResult.auditUrl,
    },
  });

  const draft = generateOutboundAbEmail({
    stableId: lead.id,
    companyName: prospect.name,
    auditUrl: auditResult.auditUrl,
  });

  await prisma.outboundLead.update({
    where: { id: lead.id },
    data: {
      emailVariant: draft.variant,
      messageSubject: draft.email_subject,
      messageBody: draft.message_body,
      suggestedTone: draft.suggested_tone,
      insightSummary: `UK cold · score ${prospect.qualifyScore}/100 · email ${draft.variant} · ${auditResult.slug}`,
    },
  });

  return { ok: true, leadId: lead.id, variant: draft.variant };
}
