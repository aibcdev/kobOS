import type { MergedPlatformLead } from "@/lib/lead-engine/merge-platform-listings";
import { discoverPlatformLeadsForCity } from "@/lib/lead-engine/run-platform-discovery";
import { prisma } from "@/lib/db/prisma";
import { LeadProspectStatus } from "@prisma/client";

export async function mergePlatformTagsOnExisting(
  workspaceRestaurantId: string,
  lead: MergedPlatformLead,
): Promise<boolean> {
  const existing = await prisma.leadProspect.findFirst({
    where: {
      workspaceRestaurantId,
      canonicalKey: lead.canonicalKey,
      status: { not: LeadProspectStatus.ARCHIVED },
    },
    select: { id: true, deliveryPlatforms: true },
  });
  if (!existing) return false;

  const platforms = [...new Set([...existing.deliveryPlatforms, ...lead.deliveryPlatforms])];
  const menuUrl =
    lead.justEatMenuUrl ?? lead.deliverooMenuUrl ?? lead.uberEatsMenuUrl ?? lead.platformUrl;

  await prisma.leadProspect.update({
    where: { id: existing.id },
    data: {
      deliveryPlatforms: platforms,
      ...(menuUrl ? { platformMenuUrl: menuUrl } : {}),
      ...(lead.platformReviewCount != null &&
      (lead.platformReviewCount ?? 0) > 0
        ? { reviewCount: lead.platformReviewCount }
        : {}),
    },
  });
  return true;
}

export async function syncPlatformTagsForCity(
  workspaceRestaurantId: string,
  city: string,
  country: "GB" | "IE",
): Promise<{ matched: number; updated: number }> {
  const leads = await discoverPlatformLeadsForCity(city, country);
  let matched = 0;
  let updated = 0;

  for (const lead of leads) {
    const ok = await mergePlatformTagsOnExisting(workspaceRestaurantId, lead);
    if (ok) {
      matched++;
      updated++;
    }
  }

  return { matched, updated };
}
