import { prisma } from "@/lib/db/prisma";

export async function buildDigestSnapshot(restaurantId: string) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [restaurant, insightStats, recStats, latestRecs, latestInsights] = await Promise.all([
    prisma.restaurant.findUnique({ where: { id: restaurantId } }),
    prisma.growthInsight.groupBy({
      by: ["status"],
      where: { restaurantId, createdAt: { gte: since } },
      _count: { id: true },
    }),
    prisma.recommendation.groupBy({
      by: ["type"],
      where: { restaurantId, createdAt: { gte: since } },
      _count: { id: true },
    }),
    prisma.recommendation.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, type: true, impactScore: true, createdAt: true },
    }),
    prisma.growthInsight.findMany({
      where: { restaurantId, status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, type: true, priority: true, createdAt: true },
    }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    restaurant: restaurant
      ? {
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
          city: restaurant.city,
          state: restaurant.state,
        }
      : null,
    windowDays: 7,
    insightsByStatus: Object.fromEntries(insightStats.map((s) => [s.status, s._count.id])),
    recommendationsByType: Object.fromEntries(recStats.map((s) => [s.type, s._count.id])),
    topRecommendations: latestRecs,
    openInsights: latestInsights,
  };
}

export async function saveDigestRun(restaurantId: string) {
  const snapshot = await buildDigestSnapshot(restaurantId);
  await prisma.digestRun.create({
    data: { restaurantId, snapshot: snapshot as object },
  });
  return snapshot;
}
