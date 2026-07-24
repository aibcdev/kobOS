import { prisma } from "../lib/db/prisma";
import { getLeadEngineConfig } from "../lib/lead-engine/config";
import { platformFoundWhere, platformQualifiedWhere } from "../lib/lead-engine/contactable-query";

async function main() {
  const wid = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID!;
  const locationMax = getLeadEngineConfig().locationMax;
  console.log("workspace", wid, "locationMax", locationMax);
  const [ol, lp, found, qualified, olStatus, score70, score70ok, oversized] = await Promise.all([
    prisma.outboundLead.count({ where: { workspaceRestaurantId: wid } }),
    prisma.leadProspect.count({ where: { workspaceRestaurantId: wid } }),
    prisma.leadProspect.count({ where: platformFoundWhere(wid) }),
    prisma.leadProspect.count({ where: platformQualifiedWhere(wid) }),
    prisma.outboundLead.groupBy({
      by: ["status"],
      where: { workspaceRestaurantId: wid },
      _count: true,
    }),
    prisma.leadProspect.count({
      where: { workspaceRestaurantId: wid, kobOpportunityScore: { gte: 70 }, status: { not: "ARCHIVED" } },
    }),
    prisma.leadProspect.count({
      where: {
        workspaceRestaurantId: wid,
        kobOpportunityScore: { gte: 70 },
        status: { not: "ARCHIVED" },
        contactEmail: { not: null },
        locationCount: { gte: 1, lte: locationMax },
      },
    }),
    prisma.leadProspect.count({
      where: {
        workspaceRestaurantId: wid,
        status: { not: "ARCHIVED" },
        locationCount: { gt: locationMax },
      },
    }),
  ]);
  console.log(
    JSON.stringify(
      {
        outboundLeads: ol,
        leadProspects: lp,
        platformFound: found,
        platformQualifiedEmail: qualified,
        score70plus: score70,
        score70WithEmailLocationsOk: score70ok,
        oversizedLocations: oversized,
        outboundByStatus: olStatus,
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
