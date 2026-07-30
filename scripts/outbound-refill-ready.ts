/**
 * Fast refill: resurrect archived prospects that already have email+website,
 * then run outreach writer to create PENDING outbound leads.
 *
 *   OUTBOUND_REFILL_NEED=60 npm run outbound:refill-ready
 */
import { LeadProspectStatus } from "@prisma/client";
import { prisma } from "../lib/db/prisma";
import { runOutreachWriter } from "../lib/lead-engine/run-outreach-writer";

async function pendingCount(wid: string) {
  return prisma.outboundLead.count({
    where: { workspaceRestaurantId: wid, status: "PENDING_APPROVAL" },
  });
}

async function main() {
  const wid = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
  if (!wid) throw new Error("OUTBOUND_WORKSPACE_RESTAURANT_ID missing");

  const need = Math.max(20, Number(process.env.OUTBOUND_REFILL_NEED || "60") || 60);
  const minScore = Math.max(50, Number(process.env.OUTBOUND_REFILL_MIN_SCORE || "65") || 65);
  const start = await pendingCount(wid);
  console.log(`start pending=${start} need=+${need} minScore=${minScore}`);

  const resurrected = await prisma.leadProspect.updateMany({
    where: {
      workspaceRestaurantId: wid,
      status: LeadProspectStatus.ARCHIVED,
      contactEmail: { not: null },
      websiteUrl: { not: null },
      outboundLeadId: null,
      kobOpportunityScore: { gte: minScore },
    },
    data: {
      status: LeadProspectStatus.ANALYZED,
      locationCount: 1,
      disqualifiers: [],
    },
  });
  console.log(`[resurrect] ${resurrected.count} → ANALYZED`);

  // Cap how many we leave ANALYZED if too many
  const analyzed = await prisma.leadProspect.findMany({
    where: {
      workspaceRestaurantId: wid,
      status: LeadProspectStatus.ANALYZED,
      contactEmail: { not: null },
      websiteUrl: { not: null },
      outboundLeadId: null,
      kobOpportunityScore: { gte: minScore },
    },
    orderBy: { kobOpportunityScore: "desc" },
    take: need + 20,
    select: { id: true },
  });
  console.log(`[writer pool] ${analyzed.length}`);

  let pending = start;
  let pass = 0;
  while (pending < start + need && pass < 5) {
    pass++;
    const remaining = start + need - pending;
    console.log(`[writer pass ${pass}] pending=${pending} remaining=${remaining}`);
    const writer = await runOutreachWriter(wid, { max: Math.max(remaining + 10, 40) });
    console.log("  writer", writer);
    pending = await pendingCount(wid);
    if (writer.queued === 0) break;
  }

  console.log(`\n=== DONE pending=${pending} (started ${start}, gained ${pending - start}) ===`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
