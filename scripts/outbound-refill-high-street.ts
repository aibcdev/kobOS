import { prisma } from "../lib/db/prisma";
import { getLeadEngineConfig } from "../lib/lead-engine/config";
import { passesHighStreetRestaurantIcp } from "../lib/lead-engine/high-street-icp";
import { isExcludedFromOutboundIcp } from "../lib/outbound/chain-denylist";
import { LeadProspectStatus } from "@prisma/client";
import { runOpportunityAnalyzer } from "../lib/lead-engine/run-opportunity-analyzer";
import { runOutreachWriter } from "../lib/lead-engine/run-outreach-writer";

async function main() {
  const wid = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
  if (!wid) throw new Error("OUTBOUND_WORKSPACE_RESTAURANT_ID missing");
  const config = getLeadEngineConfig();
  const target = 100;

  const byStatus = await prisma.leadProspect.groupBy({
    by: ["status"],
    where: { workspaceRestaurantId: wid },
    _count: true,
  });
  console.log("byStatus", byStatus);

  // Resurrect archived that pass high-street ICP + score
  const archived = await prisma.leadProspect.findMany({
    where: {
      workspaceRestaurantId: wid,
      status: LeadProspectStatus.ARCHIVED,
      contactEmail: { not: null },
      websiteUrl: { not: null },
      outboundLeadId: null,
      reviewCount: { gte: config.googleReviewMin },
      businessType: "RESTAURANT",
      locationCount: { gte: 1, lte: config.locationMax },
      kobOpportunityScore: { gte: config.minScoreForOutreach },
    },
    take: 300,
    orderBy: { kobOpportunityScore: "desc" },
  });

  const reviveIds: string[] = [];
  const fail: Record<string, number> = {};
  for (const p of archived) {
    if (isExcludedFromOutboundIcp(p.name, p.websiteUrl)) {
      fail.chain = (fail.chain || 0) + 1;
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
      fail[hs.reason] = (fail[hs.reason] || 0) + 1;
      continue;
    }
    reviveIds.push(p.id);
  }

  if (reviveIds.length) {
    await prisma.leadProspect.updateMany({
      where: { id: { in: reviveIds } },
      data: {
        status: LeadProspectStatus.ANALYZED,
        disqualifiers: [],
      },
    });
  }
  console.log({ resurrected: reviveIds.length, fail });

  // Analyze DISCOVERED restaurants with email + 100 reviews
  for (let pass = 1; pass <= 6; pass++) {
    const pending = await prisma.outboundLead.count({
      where: { workspaceRestaurantId: wid, status: "PENDING_APPROVAL" },
    });
    if (pending >= target) break;

    const discoveredLeft = await prisma.leadProspect.count({
      where: {
        workspaceRestaurantId: wid,
        status: LeadProspectStatus.DISCOVERED,
        contactEmail: { not: null },
        websiteUrl: { not: null },
        reviewCount: { gte: config.googleReviewMin },
        businessType: "RESTAURANT",
      },
    });
    console.log(`[analyzer ${pass}] pending=${pending} discoveredEligible=${discoveredLeft}`);
    if (discoveredLeft === 0) break;
    const analyzer = await runOpportunityAnalyzer(wid, { max: 80 });
    console.log("  analyzer", analyzer);
  }

  for (let pass = 1; pass <= 6; pass++) {
    const pending = await prisma.outboundLead.count({
      where: { workspaceRestaurantId: wid, status: "PENDING_APPROVAL" },
    });
    if (pending >= target) break;
    const need = target - pending;
    const writer = await runOutreachWriter(wid, { max: Math.min(80, need + 30) });
    console.log(`[writer ${pass}]`, writer, `→ pending check`);
    const after = await prisma.outboundLead.count({
      where: { workspaceRestaurantId: wid, status: "PENDING_APPROVAL" },
    });
    console.log(`  pending=${after}`);
    if (writer.queued === 0) break;
  }

  const finalPending = await prisma.outboundLead.count({
    where: { workspaceRestaurantId: wid, status: "PENDING_APPROVAL" },
  });
  const sample = await prisma.outboundLead.findMany({
    where: { workspaceRestaurantId: wid, status: "PENDING_APPROVAL" },
    take: 20,
    include: {
      leadProspect: { select: { name: true, reviewCount: true, city: true, businessType: true } },
    },
  });
  console.log(
    JSON.stringify(
      {
        finalPending,
        sample: sample.map((s) => ({
          name: s.leadProspect?.name ?? s.restaurantName,
          reviews: s.leadProspect?.reviewCount,
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
