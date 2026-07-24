import { prisma } from "../lib/db/prisma";
import { isFastFoodOrPubFormat } from "../lib/lead-engine/high-street-icp";

async function main() {
  const wid = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID!.trim();
  const need = await prisma.leadProspect.findMany({
    where: {
      workspaceRestaurantId: wid,
      status: "DISCOVERED",
      reviewCount: { gte: 100 },
      businessType: "RESTAURANT",
      websiteUrl: { not: null },
      contactEmail: null,
    },
    select: { name: true, websiteUrl: true, reviewCount: true },
    take: 800,
  });
  const blocked = need.filter((p) => isFastFoodOrPubFormat(p.name));
  console.log(
    JSON.stringify(
      {
        sample: need.length,
        blockedByNameFilter: blocked.length,
        passName: need.length - blocked.length,
        blockedSample: blocked.slice(0, 10).map((b) => b.name),
        hunterKeySet: Boolean(process.env.HUNTER_API_KEY?.trim()),
        emailMode: process.env.LEAD_ENGINE_EMAIL_MODE || "auto",
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
