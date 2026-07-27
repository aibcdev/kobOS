/**
 * Volume email enrich → analyze → queue.
 * Bottleneck fix: we already have thousands of DISCOVERED restaurants with websites;
 * they stall without contactEmail. This fills emails then pushes score≥70 into PENDING.
 *
 * Gates (yesterday’s mistakes):
 * - restaurant classifier (no caterers / agencies / convenience)
 * - chain / fast-food denylist
 * - analyzer uses scoreIcp ≥70 before writer queues
 *
 *   OUTBOUND_ENRICH_LIMIT=1000 OUTBOUND_PENDING_TARGET=500 OUTBOUND_ENRICH_CONCURRENCY=16 npm run outbound:volume
 */
import { LeadProspectStatus } from "@prisma/client";
import { prisma } from "../lib/db/prisma";
import { getLeadEngineConfig } from "../lib/lead-engine/config";
import { isFastFoodOrPubFormat } from "../lib/lead-engine/high-street-icp";
import { classifyRestaurant } from "../lib/lead-engine/restaurant-classifier";
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

function passesPreEnrichGate(name: string, websiteUrl: string | null): { ok: true } | { ok: false; reason: string } {
  if (isExcludedFromOutboundIcp(name, websiteUrl)) return { ok: false, reason: "chain_or_elite" };
  if (isFastFoodOrPubFormat(name)) return { ok: false, reason: "fast_food_or_pub" };
  const clf = classifyRestaurant({
    name,
    categories: ["restaurant"],
    websiteText: "",
    description: null,
  });
  if (!clf.is_restaurant) return { ok: false, reason: `not_restaurant:${clf.flags[0] ?? clf.reason}` };
  return { ok: true };
}

async function main() {
  const wid = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
  if (!wid) throw new Error("OUTBOUND_WORKSPACE_RESTAURANT_ID missing");

  const cfg = getLeadEngineConfig();
  const limit = Math.max(50, Number(process.env.OUTBOUND_ENRICH_LIMIT || "1000") || 1000);
  const pendingTarget = Math.max(100, Number(process.env.OUTBOUND_PENDING_TARGET || "500") || 500);
  const concurrency = Math.min(24, Math.max(2, Number(process.env.OUTBOUND_ENRICH_CONCURRENCY || "16") || 16));

  const need = await prisma.leadProspect.findMany({
    where: {
      workspaceRestaurantId: wid,
      status: LeadProspectStatus.DISCOVERED,
      businessType: "RESTAURANT",
      reviewCount: { gte: cfg.googleReviewMin },
      websiteUrl: { not: null },
      contactEmail: null,
    },
    orderBy: { reviewCount: "desc" },
    take: limit * 3,
    select: { id: true, name: true, websiteUrl: true, reviewCount: true, facebookUrl: true },
  });

  let preReject = 0;
  const targets: typeof need = [];
  for (const p of need) {
    if (targets.length >= limit) break;
    const gate = passesPreEnrichGate(p.name, p.websiteUrl);
    if (!gate.ok) {
      preReject++;
      await prisma.leadProspect.update({
        where: { id: p.id },
        data: {
          status: LeadProspectStatus.ARCHIVED,
          disqualifiers: [gate.reason],
        },
      });
      continue;
    }
    targets.push(p);
  }

  console.log(
    JSON.stringify(
      {
        googleReviewMin: cfg.googleReviewMin,
        emailMode: process.env.LEAD_ENGINE_EMAIL_MODE || "auto",
        hunter: Boolean(process.env.HUNTER_API_KEY?.trim()),
        candidates: need.length,
        preRejectArchived: preReject,
        enriching: targets.length,
        concurrency,
        pendingTarget,
        outreachCap: cfg.outreachDailyCap,
        analyzerCap: cfg.analyzerDailyCap,
        minScore: cfg.minScoreForOutreach,
      },
      null,
      2,
    ),
  );

  let found = 0;
  let hunter = 0;
  let scrape = 0;
  let fail = 0;
  let attempted = 0;
  const t0 = Date.now();
  await mapPool(targets, concurrency, async (p) => {
    try {
      const result = await enrichProspectEmail(p.websiteUrl, {
        preferScrape: true,
        businessName: p.name,
        facebookUrl: p.facebookUrl,
      });
      attempted++;
      if (!result.ok) {
        fail++;
        if (attempted % 50 === 0) {
          const rpm = Math.round((attempted / Math.max(1, (Date.now() - t0) / 60000)) * 10) / 10;
          console.log(`  progress attempted=${attempted}/${targets.length} emails=${found} fail=${fail} rpm=${rpm}`);
        }
        return;
      }
      await prisma.leadProspect.update({
        where: { id: p.id },
        data: { contactEmail: result.email, enrichmentSource: result.source },
      });
      found++;
      if (result.source === "hunter") hunter++;
      else scrape++;
      if (found % 10 === 0 || attempted % 50 === 0) {
        const rpm = Math.round((attempted / Math.max(1, (Date.now() - t0) / 60000)) * 10) / 10;
        console.log(
          `  emails=${found} (scrape=${scrape} hunter=${hunter}) fail=${fail} attempted=${attempted} rpm=${rpm}`,
        );
      }
    } catch {
      attempted++;
      fail++;
    }
  });

  console.log({ found, scrape, hunter, fail, elapsedSec: Math.round((Date.now() - t0) / 1000) });

  for (let pass = 1; pass <= 12; pass++) {
    const pending = await prisma.outboundLead.count({
      where: { workspaceRestaurantId: wid, status: "PENDING_APPROVAL" },
    });
    if (pending >= pendingTarget) break;
    const analyzer = await runOpportunityAnalyzer(wid, { max: cfg.analyzerDailyCap });
    console.log(`[analyzer ${pass}]`, analyzer);
    if (analyzer.processed === 0) break;
  }

  for (let pass = 1; pass <= 12; pass++) {
    const pending = await prisma.outboundLead.count({
      where: { workspaceRestaurantId: wid, status: "PENDING_APPROVAL" },
    });
    if (pending >= pendingTarget) break;
    const writer = await runOutreachWriter(wid, { max: cfg.outreachDailyCap });
    console.log(`[writer ${pass}]`, writer, `pending_before=${pending}`);
    const after = await prisma.outboundLead.count({
      where: { workspaceRestaurantId: wid, status: "PENDING_APPROVAL" },
    });
    console.log(`  → pending=${after}`);
    if (writer.queued === 0 && writer.processed === 0) break;
    if (writer.queued === 0) break;
  }

  const [finalPending, withEmail, analyzed70] = await Promise.all([
    prisma.outboundLead.count({
      where: { workspaceRestaurantId: wid, status: "PENDING_APPROVAL" },
    }),
    prisma.leadProspect.count({
      where: {
        workspaceRestaurantId: wid,
        status: { in: ["DISCOVERED", "ANALYZED", "QUEUED"] },
        contactEmail: { not: null },
        reviewCount: { gte: cfg.googleReviewMin },
      },
    }),
    prisma.leadProspect.count({
      where: {
        workspaceRestaurantId: wid,
        status: "ANALYZED",
        kobOpportunityScore: { gte: 70 },
        contactEmail: { not: null },
      },
    }),
  ]);
  console.log(JSON.stringify({ finalPending, withEmail, analyzed70 }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
