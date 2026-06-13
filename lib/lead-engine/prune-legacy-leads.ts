import { LeadProspectStatus } from "@prisma/client";
import { platformContactableWhere } from "@/lib/lead-engine/contactable-query";
import { prisma } from "@/lib/db/prisma";
import { isValidProspectEmail } from "@/lib/outbound/validate-prospect-email";

export type PruneLegacyResult = {
  archivedLegacy: number;
  clearedBadEmails: number;
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

  const platformContactable = await prisma.leadProspect.count({
    where: platformContactableWhere(workspaceRestaurantId),
  });

  return {
    archivedLegacy: archived.count,
    clearedBadEmails,
    platformContactable,
  };
}
