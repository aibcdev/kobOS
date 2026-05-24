import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import type { AuditVisualIntelligenceResult } from "@/lib/audit/visual-intelligence";
import { BrandVisualsWireframe } from "@/components/dashboard/brand/BrandVisualsWireframe";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { prisma } from "@/lib/db/prisma";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Visuals Studio · KOB",
  description: "Visual health, audit pixel signals, and food photography studio.",
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

function asPixelMetrics(v: unknown): AuditVisualIntelligenceResult | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Partial<AuditVisualIntelligenceResult>;
  if (o.version !== 1 || typeof o.overallHeuristic !== "number") return null;
  return v as AuditVisualIntelligenceResult;
}

export default async function VisualsPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  if (isUiPreviewEnabled()) {
    return <PreviewPlaceholder title="Visuals Studio" description="Connect the database for assets and audit-linked metrics." />;
  }
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  const [latestScan, assets, typeCounts, siteScanRow] = await Promise.all([
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
    prisma.siteScan.findFirst({
      where: { visibilityAudit: { restaurantId } },
      orderBy: { updatedAt: "desc" },
      select: { visualMetricsJson: true },
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
    ? `Last DailyScan: ${latestScan.scanDate.toISOString().slice(0, 10)}`
    : "No DailyScan yet — score blends your current asset mix.";

  const wireAssets = assets.map((a) => ({
    id: a.id,
    type: a.type,
    url: a.url,
    qualityScore: qualityFromMetadata(a.metadata),
  }));

  const pixelMetrics = asPixelMetrics(siteScanRow?.visualMetricsJson ?? null);

  return (
    <div className="mx-auto max-w-5xl px-[var(--spacing-md)] py-10">
      <BrandVisualsWireframe
        restaurantId={restaurantId}
        restaurantName={restaurant.name}
        visualScore={visualScore}
        breakdown={breakdown}
        lastImprovedLabel={lastImprovedLabel}
        assets={wireAssets}
        pixelMetrics={pixelMetrics}
        heroEyebrow={restaurant.name}
        heroTitle="Visuals & Branding Studio"
        heroSubtitle="Make your food impossible to scroll past — live tiles, AI food photography prompts, and pixel signals from your linked public audit."
      />
    </div>
  );
}
