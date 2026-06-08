import { OutboundLeadSource, OutboundLeadStatus } from "@prisma/client";
import { hostFromWebsiteUrl } from "@/lib/outbound/chain-denylist";
import type { UkColdQualifiedProspect } from "@/lib/outbound/prospect-types";
import type { UkColdDraft } from "@/lib/outbound/generate-uk-cold-draft";
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
  draft: UkColdDraft,
) {
  return prisma.outboundLead.create({
    data: {
      workspaceRestaurantId,
      placeId: prospect.placeId,
      city,
      restaurantName: prospect.name,
      websiteUrl: prospect.websiteUrl,
      contactEmail: prospect.contactEmail,
      insightSummary: `UK cold · score ${prospect.qualifyScore}/100 · ${prospect.topIssue}`,
      messageSubject: draft.email_subject,
      messageBody: draft.message_body,
      suggestedTone: draft.suggested_tone,
      status: OutboundLeadStatus.PENDING_APPROVAL,
      source: OutboundLeadSource.UK_COLD,
      qualifyScore: prospect.qualifyScore,
      reviewCount: prospect.userRatingCount,
      enrichmentSource: prospect.enrichmentSource,
    },
  });
}
