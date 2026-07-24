/**
 * Archive pending outbound that fails high-street ICP, then refill toward 100.
 *
 * Rules: ≥100 Google reviews, not fast-food/pub, not inactive (IG 2y + reviews 6m),
 * restaurant business type.
 */
import { LeadProspectStatus, OutboundLeadStatus } from "@prisma/client";
import { prisma } from "../lib/db/prisma";
import { getLeadEngineConfig } from "../lib/lead-engine/config";
import { passesHighStreetRestaurantIcp } from "../lib/lead-engine/high-street-icp";
import { runOutreachWriter } from "../lib/lead-engine/run-outreach-writer";
import { isExcludedFromOutboundIcp } from "../lib/outbound/chain-denylist";

async function pendingCount(wid: string) {
  return prisma.outboundLead.count({
    where: { workspaceRestaurantId: wid, status: OutboundLeadStatus.PENDING_APPROVAL },
  });
}

async function main() {
  const wid = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
  if (!wid) throw new Error("OUTBOUND_WORKSPACE_RESTAURANT_ID missing");

  const config = getLeadEngineConfig();
  const target = Math.max(100, Number(process.env.OUTBOUND_PENDING_TARGET || "100") || 100);

  const pending = await prisma.outboundLead.findMany({
    where: {
      workspaceRestaurantId: wid,
      status: { in: [OutboundLeadStatus.PENDING_APPROVAL, OutboundLeadStatus.DRAFT, OutboundLeadStatus.APPROVED] },
    },
    include: { leadProspect: true },
  });

  const reasons: Record<string, number> = {};
  const archiveLeadIds: string[] = [];
  const archiveProspectIds: string[] = [];

  for (const lead of pending) {
    const p = lead.leadProspect;
    let reason: string | null = null;
    if (!p) {
      reason = "missing_prospect";
    } else if (isExcludedFromOutboundIcp(p.name, p.websiteUrl)) {
      reason = "chain_or_elite";
    } else {
      const hs = passesHighStreetRestaurantIcp({
        name: p.name,
        websiteUrl: p.websiteUrl,
        reviewCount: p.reviewCount,
        googleReviewMin: config.googleReviewMin,
        lastReviewAt: p.lastReviewAt,
        instagramUrl: p.instagramUrl,
        instagramPostGapDays: p.instagramPostGapDays,
        businessType: p.businessType,
        deliveryPlatforms: p.deliveryPlatforms,
        hasOnlineOrdering: p.hasOnlineOrdering,
      });
      if (!hs.ok) reason = hs.reason;
    }

    if (reason) {
      reasons[reason] = (reasons[reason] ?? 0) + 1;
      archiveLeadIds.push(lead.id);
      if (p) archiveProspectIds.push(p.id);
    }
  }

  if (archiveLeadIds.length) {
    await prisma.outboundLead.updateMany({
      where: { id: { in: archiveLeadIds } },
      data: { status: OutboundLeadStatus.ARCHIVED },
    });
  }

  if (archiveProspectIds.length) {
    // Clear outbound link so writer can skip; archive with reason
    await prisma.$transaction(
      archiveProspectIds.map((id) => {
        const lead = pending.find((l) => l.leadProspect?.id === id);
        const p = lead?.leadProspect;
        let reason = "high_street_icp";
        if (p) {
          if (isExcludedFromOutboundIcp(p.name, p.websiteUrl)) reason = "chain_or_elite";
          else {
            const hs = passesHighStreetRestaurantIcp({
              name: p.name,
              websiteUrl: p.websiteUrl,
              reviewCount: p.reviewCount,
              googleReviewMin: config.googleReviewMin,
              lastReviewAt: p.lastReviewAt,
              instagramUrl: p.instagramUrl,
              instagramPostGapDays: p.instagramPostGapDays,
              businessType: p.businessType,
              deliveryPlatforms: p.deliveryPlatforms,
              hasOnlineOrdering: p.hasOnlineOrdering,
            });
            if (!hs.ok) reason = hs.reason;
          }
        }
        return prisma.leadProspect.update({
          where: { id },
          data: {
            status: LeadProspectStatus.ARCHIVED,
            outboundLeadId: null,
            disqualifiers: [reason],
          },
        });
      }),
    );
  }

  // Also archive ANALYZED pool rows that fail the new floor (so writer won't pick them)
  const analyzed = await prisma.leadProspect.findMany({
    where: {
      workspaceRestaurantId: wid,
      status: LeadProspectStatus.ANALYZED,
      outboundLeadId: null,
    },
    select: {
      id: true,
      name: true,
      websiteUrl: true,
      reviewCount: true,
      lastReviewAt: true,
      instagramUrl: true,
      instagramPostGapDays: true,
      businessType: true,
      deliveryPlatforms: true,
      hasOnlineOrdering: true,
    },
  });

  let poolArchived = 0;
  for (const p of analyzed) {
    if (isExcludedFromOutboundIcp(p.name, p.websiteUrl)) {
      await prisma.leadProspect.update({
        where: { id: p.id },
        data: { status: LeadProspectStatus.ARCHIVED, disqualifiers: ["chain_or_elite"] },
      });
      poolArchived++;
      continue;
    }
    const hs = passesHighStreetRestaurantIcp({
      name: p.name,
      websiteUrl: p.websiteUrl,
      reviewCount: p.reviewCount,
      googleReviewMin: config.googleReviewMin,
      lastReviewAt: p.lastReviewAt,
      instagramUrl: p.instagramUrl,
      instagramPostGapDays: p.instagramPostGapDays,
      businessType: p.businessType,
      deliveryPlatforms: p.deliveryPlatforms,
      hasOnlineOrdering: p.hasOnlineOrdering,
    });
    if (!hs.ok) {
      await prisma.leadProspect.update({
        where: { id: p.id },
        data: { status: LeadProspectStatus.ARCHIVED, disqualifiers: [hs.reason] },
      });
      poolArchived++;
    }
  }

  const afterPurge = await pendingCount(wid);
  console.log(
    JSON.stringify(
      {
        googleReviewMin: config.googleReviewMin,
        archivedOutbound: archiveLeadIds.length,
        reasons,
        poolArchived,
        pendingAfterPurge: afterPurge,
        target,
      },
      null,
      2,
    ),
  );

  let pendingNow = afterPurge;
  let writerPasses = 0;
  while (pendingNow < target && writerPasses < 8) {
    writerPasses++;
    const need = target - pendingNow;
    const writer = await runOutreachWriter(wid, { max: Math.min(80, need + 20) });
    pendingNow = await pendingCount(wid);
    console.log(`[writer ${writerPasses}]`, writer, `pending=${pendingNow}`);
    if (writer.queued === 0) break;
  }

  // Sample remaining pending names
  const sample = await prisma.outboundLead.findMany({
    where: { workspaceRestaurantId: wid, status: OutboundLeadStatus.PENDING_APPROVAL },
    take: 15,
    orderBy: { createdAt: "desc" },
    include: {
      leadProspect: {
        select: { name: true, reviewCount: true, businessType: true, city: true, lastReviewAt: true },
      },
    },
  });

  console.log(
    JSON.stringify(
      {
        finalPending: await pendingCount(wid),
        sample: sample.map((s) => ({
          company: s.companyName,
          reviews: s.leadProspect?.reviewCount,
          type: s.leadProspect?.businessType,
          city: s.leadProspect?.city,
        })),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
