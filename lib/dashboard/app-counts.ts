import { prisma } from "@/lib/db/prisma";

export type AppCounts = Record<string, number>;

export async function getAppCounts(restaurantId: string): Promise<AppCounts> {
  const weekAgo = new Date();
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);

  const [campaigns, content, keywords, assets, traffic, reviews, reviewsPending, integrations, insights, outbound] =
    await Promise.all([
      prisma.campaign.count({ where: { restaurantId, status: { in: ["DRAFT", "SCHEDULED", "ACTIVE"] } } }),
      prisma.generatedContent.count({ where: { restaurantId } }),
      prisma.keyword.count({ where: { restaurantId } }),
      prisma.asset.count({ where: { restaurantId } }),
      prisma.websiteEvent.count({ where: { restaurantId, createdAt: { gte: weekAgo } } }),
      prisma.customerReview.count({ where: { restaurantId, reviewedAt: { gte: weekAgo } } }),
      prisma.customerReview.count({ where: { restaurantId, replied: false } }),
      prisma.integration.count({ where: { restaurantId } }),
      prisma.growthInsight.count({ where: { restaurantId, status: "OPEN" } }),
      prisma.outboundLead.count({ where: { workspaceRestaurantId: restaurantId, status: { in: ["DRAFT", "PENDING_APPROVAL", "APPROVED"] } } }),
    ]);

  return {
    campaigns,
    content,
    keywords,
    assets,
    traffic,
    reviews,
    reviewsPending,
    integrations,
    insights,
    outbound,
    ordering: 0,
  };
}
