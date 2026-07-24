#!/usr/bin/env npx tsx
/**
 * Sprint: get ~57 more outbound A/B drafts ready fast.
 * 1) Resurrect archived score≥70 + email + website
 * 2) Scrape emails onto DISCOVERED websites
 * 3) Analyze
 * 4) Outreach writer (creates audits + A/B templates)
 */
import { LeadProspectStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { runOpportunityAnalyzer } from "@/lib/lead-engine/run-opportunity-analyzer";
import { runOutreachWriter } from "@/lib/lead-engine/run-outreach-writer";
import { enrichProspectEmail } from "@/lib/outbound/enrich-email";

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

  const need = Math.max(57, Number(process.env.OUTBOUND_SPRINT_NEED || "57") || 57);
  const startPending = await pendingCount(wid);
  console.log(`start pending=${startPending} need=+${need} → target≈${startPending + need}`);

  // 1) Resurrect archived score≥70 with email+website, no hard DQs
  const resurrected = await prisma.leadProspect.updateMany({
    where: {
      workspaceRestaurantId: wid,
      status: LeadProspectStatus.ARCHIVED,
      contactEmail: { not: null },
      websiteUrl: { not: null },
      outboundLeadId: null,
      kobOpportunityScore: { gte: 70 },
      disqualifiers: { isEmpty: true },
    },
    data: {
      status: LeadProspectStatus.ANALYZED,
      locationCount: 1,
      disqualifiers: [],
    },
  });
  console.log(`[resurrect] ${resurrected.count} → ANALYZED`);

  // Also clear soft-only instagram_too_large if we still need volume
  const soft = await prisma.leadProspect.updateMany({
    where: {
      workspaceRestaurantId: wid,
      status: LeadProspectStatus.ARCHIVED,
      contactEmail: { not: null },
      websiteUrl: { not: null },
      outboundLeadId: null,
      kobOpportunityScore: { gte: 70 },
      disqualifiers: { equals: ["instagram_too_large"] },
    },
    data: {
      status: LeadProspectStatus.ANALYZED,
      locationCount: 1,
      disqualifiers: [],
    },
  });
  console.log(`[resurrect soft] ${soft.count} instagram_too_large → ANALYZED`);

  // 2) Scrape emails onto discovered websites (fast path)
  const toEnrich = await prisma.leadProspect.findMany({
    where: {
      workspaceRestaurantId: wid,
      status: LeadProspectStatus.DISCOVERED,
      websiteUrl: { not: null },
      contactEmail: null,
    },
    orderBy: { createdAt: "asc" },
    take: 120,
    select: { id: true, websiteUrl: true, name: true },
  });
  console.log(`[email scrape] trying ${toEnrich.length} sites…`);
  let emailsFound = 0;
  await mapPool(toEnrich, 10, async (row) => {
    const url = row.websiteUrl!;
    try {
      const result = await enrichProspectEmail(url, { preferScrape: true });
      if (!result.ok) return;
      await prisma.leadProspect.update({
        where: { id: row.id },
        data: { contactEmail: result.email, enrichmentSource: result.source },
      });
      emailsFound++;
      if (emailsFound % 5 === 0) console.log(`  emails found=${emailsFound}`);
    } catch {
      /* ignore */
    }
  });
  console.log(`[email scrape] found=${emailsFound}`);

  // 3) Analyze discovered+email
  console.log("[analyzer]");
  const analyzer = await runOpportunityAnalyzer(wid, { max: 150 });
  console.log("  analyzer", analyzer);

  // 4) Write outreach until we hit target
  let pending = await pendingCount(wid);
  let pass = 0;
  while (pending < startPending + need && pass < 4) {
    pass++;
    const remaining = startPending + need - pending;
    console.log(`[writer pass ${pass}] pending=${pending} remaining=${remaining}`);
    const writer = await runOutreachWriter(wid, { max: Math.max(remaining + 5, 60) });
    console.log("  writer", writer);
    pending = await pendingCount(wid);
    if (writer.queued === 0) break;
  }

  console.log(`\n=== DONE pending=${pending} (started ${startPending}, gained ${pending - startPending}) ===`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
