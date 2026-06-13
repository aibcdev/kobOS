import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const workspaceId = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();

if (!workspaceId) {
  console.error("Set OUTBOUND_WORKSPACE_RESTAURANT_ID");
  process.exit(1);
}

const rows = await prisma.$queryRaw`
  SELECT id, name, city, country, "deliveryPlatforms", "platformRank", "platformRankPercentile",
         "platformRegion", "reviewCount", rating, "contactEmail", "websiteUrl",
         "locationCount", "websiteStale", "websiteCopyrightYear", "kobOpportunityScore",
         status, "instagramFollowers", "hasTikTok", opportunities, disqualifiers, "createdAt"
  FROM "LeadProspect"
  WHERE "workspaceRestaurantId" = ${workspaceId}
    AND "contactEmail" IS NOT NULL
    AND status != 'ARCHIVED'
  ORDER BY RANDOM()
  LIMIT 5
`;

console.log(JSON.stringify(rows, null, 2));
await prisma.$disconnect();
