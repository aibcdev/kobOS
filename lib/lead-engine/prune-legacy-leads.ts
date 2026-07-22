import { LeadProspectStatus } from "@prisma/client";
import { platformContactableWhere, platformQualifiedWhere } from "@/lib/lead-engine/contactable-query";
import { prisma } from "@/lib/db/prisma";
import { isValidProspectEmail } from "@/lib/outbound/validate-prospect-email";

export type PruneLegacyResult = {
  archivedLegacy: number;
  archivedOffProfile: number;
  clearedBadEmails: number;
  platformQualified: number;
  platformContactable: number;
};

export async function pruneLegacyLeads(workspaceRestaurantId: string): Promise<PruneLegacyResult> {
  const archived = await prisma.leadProspect.updateMany({
    where: {
      workspaceRestaurantId,
      deliveryPlatforms: { isEmpty: true },
      status: { not: LeadProspectStatus.ARCHIVED },
    },
    data: { status: LeadProspectStatus.ARCHIVED },
  });

  const archivedOffProfile = await prisma.leadProspect.updateMany({
    where: {
      workspaceRestaurantId,
      status: { in: [LeadProspectStatus.DISCOVERED, LeadProspectStatus.ANALYZED] },
      NOT: platformQualifiedWhere(workspaceRestaurantId),
    },
    data: { status: LeadProspectStatus.ARCHIVED },
  });

  const withEmail = await prisma.leadProspect.findMany({
    where: {
      workspaceRestaurantId,
      contactEmail: { not: null },
      deliveryPlatforms: { isEmpty: false },
      status: { not: LeadProspectStatus.ARCHIVED },
    },
    select: { id: true, contactEmail: true, websiteUrl: true },
  });

  let clearedBadEmails = 0;
  for (const row of withEmail) {
    if (!row.contactEmail) continue;
    const valid = isValidProspectEmail(row.contactEmail, row.websiteUrl);
    if (valid.ok) continue;
    await prisma.leadProspect.update({
      where: { id: row.id },
      data: { contactEmail: null, enrichmentSource: `invalid:${valid.reason}` },
    });
    clearedBadEmails++;
  }

  const platformQualified = await prisma.leadProspect.count({
    where: platformQualifiedWhere(workspaceRestaurantId),
  });

  const platformContactable = await prisma.leadProspect.count({
    where: platformContactableWhere(workspaceRestaurantId),
  });

  return {
    archivedLegacy: archived.count,
    archivedOffProfile: archivedOffProfile.count,
    clearedBadEmails,
    platformQualified,
    platformContactable,
  };
}
