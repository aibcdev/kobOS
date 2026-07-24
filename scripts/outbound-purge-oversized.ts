/**
 * Archive any non-archived prospects / pending outbound leads with > locationMax sites.
 */
import { getLeadEngineConfig } from "../lib/lead-engine/config";
import { prisma } from "../lib/db/prisma";

async function main() {
  const wid = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
  if (!wid) throw new Error("OUTBOUND_WORKSPACE_RESTAURANT_ID missing");
  const max = getLeadEngineConfig().locationMax;

  const oversized = await prisma.leadProspect.updateMany({
    where: {
      workspaceRestaurantId: wid,
      status: { not: "ARCHIVED" },
      locationCount: { gt: max },
    },
    data: {
      status: "ARCHIVED",
      disqualifiers: [`too_many_locations (>${max})`],
    },
  });

  const pendingBad = await prisma.outboundLead.findMany({
    where: {
      workspaceRestaurantId: wid,
      status: { in: ["PENDING_APPROVAL", "DRAFT", "APPROVED"] },
      leadProspect: { locationCount: { gt: max } },
    },
    select: { id: true },
  });
  if (pendingBad.length) {
    await prisma.outboundLead.updateMany({
      where: { id: { in: pendingBad.map((r) => r.id) } },
      data: { status: "ARCHIVED" },
    });
  }

  console.log(
    JSON.stringify(
      {
        locationMax: max,
        archivedProspects: oversized.count,
        archivedOutboundLeads: pendingBad.length,
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
