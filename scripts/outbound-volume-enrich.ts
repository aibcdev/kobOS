/**
 * Volume email enrich: scrape first, then Hunter (LEAD_ENGINE_EMAIL_MODE=auto).
 * Targets DISCOVERED restaurants with website + ≥100 Google reviews.
 */
import { LeadProspectStatus } from "@prisma/client";
import { prisma } from "../lib/db/prisma";
import { isFastFoodOrPubFormat } from "../lib/lead-engine/high-street-icp";
import { isExcludedFromOutboundIcp } from "../lib/outbound/chain-denylist";
import { enrichProspectEmail } from "../lib/outbound/enrich-email";
import { runOpportunityAnalyzer } from "../lib/lead-engine/run-opportunity-analyzer";
import { runOutreachWriter } from "../lib/lead-engine/run-outreach-writer";

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, items.length || 1)) }, () => worker()));
  return results;
}

async function main() {
  const wid = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
  if (!wid) throw new Error("OUTBOUND_WORKSPACE_RESTAURANT_ID missing");

  const limit = Math.max(50, Number(process.env.OUTBOUND_ENRICH_LIMIT || "400") || 400);
  const pendingTarget = Math.max(100, Number(process.env.OUTBOUND_PENDING_TARGET || "250") || 250);

  const need = await prisma.leadProspect.findMany({
    where: {
      workspaceRestaurantId: wid,
      status: LeadProspectStatus.DISCOVERED,
      businessType: "RESTAURANT",
      reviewCount: { gte: 100 },
      websiteUrl: { not: null },
      contactEmail: null,
    },
    orderBy: { reviewCount: "desc" },
    take: limit * 2,
    select: { id: true, name: true, websiteUrl: true, reviewCount: true },
  });

  const targets = need
    .filter((p) => !isExcludedFromOutboundIcp(p.name, p.websiteUrl) && !isFastFoodOrPubFormat(p.name))
    .slice(0, limit);

  console.log(
    JSON.stringify(
      {
        emailMode: process.env.LEAD_ENGINE_EMAIL_MODE || "auto",
        hunter: Boolean(process.env.HUNTER_API_KEY?.trim()),
        candidates: need.length,
        enriching: targets.length,
        pendingTarget,
      },
      null,
      2,
    ),
  );

  let found = 0;
  let hunter = 0;
  let scrape = 0;
  let fail = 0;
  await mapPool(targets, 4, async (p) => {
    try {
      const result = await enrichProspectEmail(p.websiteUrl, { preferScrape: true });
      if (!result.ok) {
        fail++;
        return;
      }
      await prisma.leadProspect.update({
        where: { id: p.id },
        data: { contactEmail: result.email, enrichmentSource: result.source },
      });
      found++;
      if (result.source === "hunter") hunter++;
      else scrape++;
      if (found % 10 === 0) console.log(`  emails=${found} (scrape=${scrape} hunter=${hunter}) fail=${fail}`);
    } catch {
      fail++;
    }
  });

  console.log({ found, scrape, hunter, fail });

  for (let pass = 1; pass <= 10; pass++) {
    const pending = await prisma.outboundLead.count({
      where: { workspaceRestaurantId: wid, status: "PENDING_APPROVAL" },
    });
    if (pending >= pendingTarget) break;
    const analyzer = await runOpportunityAnalyzer(wid, { max: 80 });
    console.log(`[analyzer ${pass}]`, analyzer);
    if (analyzer.processed === 0) break;
  }

  for (let pass = 1; pass <= 10; pass++) {
    const pending = await prisma.outboundLead.count({
      where: { workspaceRestaurantId: wid, status: "PENDING_APPROVAL" },
    });
    if (pending >= pendingTarget) break;
    const writer = await runOutreachWriter(wid, { max: 80 });
    console.log(`[writer ${pass}]`, writer, `pending=${pending}`);
    const after = await prisma.outboundLead.count({
      where: { workspaceRestaurantId: wid, status: "PENDING_APPROVAL" },
    });
    console.log(`  → ${after}`);
    if (writer.queued === 0) break;
  }

  const finalPending = await prisma.outboundLead.count({
    where: { workspaceRestaurantId: wid, status: "PENDING_APPROVAL" },
  });
  const withEmail = await prisma.leadProspect.count({
    where: {
      workspaceRestaurantId: wid,
      status: "DISCOVERED",
      contactEmail: { not: null },
      reviewCount: { gte: 100 },
    },
  });
  console.log(JSON.stringify({ finalPending, discoveredWithEmail100: withEmail }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
