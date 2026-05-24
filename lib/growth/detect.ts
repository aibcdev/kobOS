import { prisma } from "@/lib/db/prisma";

/** Rule-based insight seeding. Off by default — set `GROWTH_SEED_DEMO=1` for local demos. */
export async function detectInsightsFromRules(restaurantId: string): Promise<number> {
  if (process.env.GROWTH_SEED_DEMO !== "1") {
    return 0;
  }

  const recentCount = await prisma.growthInsight.count({
    where: {
      restaurantId,
      createdAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
    },
  });
  if (recentCount >= 3) {
    return 0;
  }

  await prisma.growthInsight.create({
    data: {
      restaurantId,
      type: "SEO_OPPORTUNITY",
      priority: "HIGH",
      title: "High demand keyword opportunity",
      description:
        "You may be missing rankings for nearby high-intent searches (demo insight). Connect Google Search Console to refine this signal.",
      data: { source: "rules_v1", demo: true },
    },
  });
  return 1;
}
