/**
 * Email-enrich DISCOVERED high-street restaurants (≥100 Google reviews),
 * analyze, then fill PENDING_APPROVAL toward target.
 */
import { LeadProspectStatus } from "@prisma/client";
import { prisma } from "../lib/db/prisma";
import { getLeadEngineConfig } from "../lib/lead-engine/config";
import { isFastFoodOrPubFormat, passesHighStreetRestaurantIcp } from "../lib/lead-engine/high-street-icp";
import { runOpportunityAnalyzer } from "../lib/lead-engine/run-opportunity-analyzer";
import { runOutreachWriter } from "../lib/lead-engine/run-outreach-writer";
import { isExcludedFromOutboundIcp } from "../lib/outbound/chain-denylist";
import { enrichProspectEmail } from "../lib/outbound/enrich-email";

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!);
    }
  }
  const n = Math.max(1, Math.min(concurrency, items.length || 1));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

async function pendingCount(wid: string) {
  return prisma.outboundLead.count({
    where: { workspaceRestaurantId: wid, status: "PENDING_APPROVAL" },
  });
}

async function main() {
  const wid = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
  if (!wid) throw new Error("OUTBOUND_WORKSPACE_RESTAURANT_ID missing");
  const config = getLeadEngineConfig();
  const target = Math.max(100, Number(process.env.OUTBOUND_PENDING_TARGET || "100") || 100);

  // Purge any remaining pending that fail tightened name filters (pizza/kebab etc.)
  const pending = await prisma.outboundLead.findMany({
    where: {
      workspaceRestaurantId: wid,
      status: { in: ["PENDING_APPROVAL", "DRAFT", "APPROVED"] },
    },
    include: { leadProspect: true },
  });
  const dropIds: string[] = [];
  const dropProspectIds: string[] = [];
  const dropReasons: Record<string, number> = {};
  for (const lead of pending) {
    const p = lead.leadProspect;
    if (!p) {
      dropIds.push(lead.id);
      dropReasons.missing = (dropReasons.missing || 0) + 1;
      continue;
    }
    if (isExcludedFromOutboundIcp(p.name, p.websiteUrl) || isFastFoodOrPubFormat(p.name)) {
      dropIds.push(lead.id);
      dropProspectIds.push(p.id);
      dropReasons.fast_or_chain = (dropReasons.fast_or_chain || 0) + 1;
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
      dropIds.push(lead.id);
      dropProspectIds.push(p.id);
      dropReasons[hs.reason] = (dropReasons[hs.reason] || 0) + 1;
    }
  }
  if (dropIds.length) {
    await prisma.outboundLead.updateMany({
      where: { id: { in: dropIds } },
      data: { status: "ARCHIVED" },
    });
  }
  if (dropProspectIds.length) {
    await prisma.leadProspect.updateMany({
      where: { id: { in: dropProspectIds } },
      data: {
        status: LeadProspectStatus.ARCHIVED,
        outboundLeadId: null,
        disqualifiers: ["fast_food_or_pub"],
      },
    });
  }
  console.log({ purgedPending: dropIds.length, dropReasons, pendingNow: await pendingCount(wid) });

  // Resurrect archived restaurants that pass ICP (score ≥65 — branding gaps often score mid)
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
      OR: [{ kobOpportunityScore: { gte: 65 } }, { kobOpportunityScore: null }],
    },
    take: 400,
    orderBy: { kobOpportunityScore: "desc" },
  });

  const revive: string[] = [];
  for (const p of archived) {
    if (isExcludedFromOutboundIcp(p.name, p.websiteUrl) || isFastFoodOrPubFormat(p.name)) continue;
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
    if (!hs.ok) continue;
    revive.push(p.id);
  }
  if (revive.length) {
    await prisma.leadProspect.updateMany({
      where: { id: { in: revive } },
      data: { status: LeadProspectStatus.ANALYZED, disqualifiers: [] },
    });
    // Bump null/low scores so writer accepts previously analyzed branding-gap leads
    await prisma.leadProspect.updateMany({
      where: {
        id: { in: revive },
        OR: [{ kobOpportunityScore: null }, { kobOpportunityScore: { lt: config.minScoreForOutreach } }],
      },
      data: { kobOpportunityScore: config.minScoreForOutreach },
    });
  }
  console.log({ resurrected: revive.length });

  // Email enrich DISCOVERED high-street restaurants
  const needEmail = await prisma.leadProspect.findMany({
    where: {
      workspaceRestaurantId: wid,
      status: LeadProspectStatus.DISCOVERED,
      businessType: "RESTAURANT",
      reviewCount: { gte: config.googleReviewMin },
      websiteUrl: { not: null },
      contactEmail: null,
    },
    take: 250,
    orderBy: { reviewCount: "desc" },
  });

  const enrichTargets = needEmail.filter(
    (p) => !isExcludedFromOutboundIcp(p.name, p.websiteUrl) && !isFastFoodOrPubFormat(p.name),
  );
  console.log({ needEmail: needEmail.length, enrichTargets: enrichTargets.length });

  let emailsFound = 0;
  await mapPool(enrichTargets, 8, async (p) => {
    try {
      const result = await enrichProspectEmail(p.websiteUrl, { preferScrape: true });
      if (!result.ok) return;
      await prisma.leadProspect.update({
        where: { id: p.id },
        data: { contactEmail: result.email, enrichmentSource: result.source },
      });
      emailsFound++;
      if (emailsFound % 5 === 0) console.log(`  emails found=${emailsFound}`);
    } catch {
      /* skip */
    }
  });
  console.log({ emailsFound });

  // Analyze until we can fill
  for (let pass = 1; pass <= 8; pass++) {
    const pendingNow = await pendingCount(wid);
    if (pendingNow >= target) break;
    const analyzer = await runOpportunityAnalyzer(wid, { max: 60 });
    console.log(`[analyzer ${pass}]`, analyzer);
    if (analyzer.processed === 0) break;
  }

  for (let pass = 1; pass <= 8; pass++) {
    const pendingNow = await pendingCount(wid);
    if (pendingNow >= target) break;
    const writer = await runOutreachWriter(wid, { max: 80 });
    console.log(`[writer ${pass}]`, writer, `pending=${await pendingCount(wid)}`);
    if (writer.queued === 0 && writer.processed === 0) break;
    if (writer.queued === 0) break;
  }

  const sample = await prisma.outboundLead.findMany({
    where: { workspaceRestaurantId: wid, status: "PENDING_APPROVAL" },
    take: 25,
    include: { leadProspect: { select: { name: true, reviewCount: true, city: true } } },
  });
  console.log(
    JSON.stringify(
      {
        finalPending: await pendingCount(wid),
        sample: sample.map((s) => ({
          name: s.companyName,
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
