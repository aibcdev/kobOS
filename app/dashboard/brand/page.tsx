import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { BrandVisualsWireframe } from "@/components/dashboard/brand/BrandVisualsWireframe";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { prisma } from "@/lib/db/prisma";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Brand & Visuals · KOB",
  description: "Branding scanner, food photography briefs, and video concepts.",
};

function qualityFromMetadata(metadata: Prisma.JsonValue): number {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata) && "quality" in metadata) {
    const q = (metadata as { quality: unknown }).quality;
    if (typeof q === "number" && Number.isFinite(q)) return Math.min(100, Math.max(0, Math.round(q)));
  }
  return 62;
}

function clampScore(n: number) {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export default async function BrandPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  if (isUiPreviewEnabled()) {
    return <PreviewPlaceholder title="Brand & Visuals" description="Scans and assets load from the database." />;
  }
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  const [latestScan, assets, typeCounts] = await Promise.all([
    prisma.dailyScan.findFirst({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.asset.findMany({
      where: { restaurantId },
      orderBy: { uploadedAt: "desc" },
      take: 18,
    }),
    prisma.asset.groupBy({
      by: ["type"],
      where: { restaurantId },
      _count: { _all: true },
    }),
  ]);

  const count = (t: string) => typeCounts.find((x) => x.type === t)?._count._all ?? 0;
  const nFood = count("FOOD_PHOTO");
  const nVideo = count("VIDEO");
  const nBrand = count("BRANDING") + count("LOGO");
  const nHero = count("WEBSITE_SCREENSHOT");

  const base = latestScan?.visualHealthScore ?? 52;
  const breakdown = {
    foodPhotography: clampScore(base + (nFood > 0 ? 8 : -10) + Math.min(12, nFood * 2)),
    video: clampScore(base + (nVideo > 0 ? 6 : -14) + Math.min(10, nVideo * 3)),
    brandConsistency: clampScore(base + (nBrand > 0 ? 4 : -6) + Math.min(8, nBrand * 2)),
    heroImagery: clampScore(base + (nHero > 0 ? 2 : -8) + Math.min(6, nHero)),
  };

  const visualScore =
    latestScan?.visualHealthScore ??
    clampScore((breakdown.foodPhotography + breakdown.video + breakdown.brandConsistency + breakdown.heroImagery) / 4);

  const lastImprovedLabel = latestScan
    ? `Last DailyScan: ${latestScan.scanDate.toISOString().slice(0, 10)} · headline score from DailyScan`
    : "No DailyScan yet — headline score is estimated from your asset mix.";

  const wireAssets = assets.map((a) => ({
    id: a.id,
    type: a.type,
    url: a.url,
    qualityScore: qualityFromMetadata(a.metadata),
  }));

  return (
    <div className="mx-auto max-w-5xl px-[var(--spacing-md)] py-10">
      <BrandVisualsWireframe
        restaurantId={restaurantId}
        restaurantName={restaurant.name}
        visualScore={visualScore}
        breakdown={breakdown}
        lastImprovedLabel={lastImprovedLabel}
        assets={wireAssets}
      />
    </div>
  );
}
