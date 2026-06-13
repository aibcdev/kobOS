import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkspaceHub } from "@/components/dashboard/workspace/WorkspaceHub";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Workspace · KOB",
  description: "Shared memory for your restaurant.",
};

export default async function WorkspacePage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  const [assets, content, tasks, pins, integrations, restaurantRow] = await Promise.all([
    prisma.asset.findMany({ where: { restaurantId }, orderBy: { uploadedAt: "desc" }, take: 5 }),
    prisma.generatedContent.findMany({ where: { restaurantId }, orderBy: { createdAt: "desc" }, take: 3, select: { id: true, prompt: true } }),
    prisma.chiefOfStaffTask.findMany({ where: { restaurantId }, orderBy: { createdAt: "desc" }, take: 3, select: { id: true, title: true } }),
    prisma.workspaceAppPin.findMany({ where: { restaurantId }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.integration.findMany({ where: { restaurantId }, select: { provider: true } }),
    prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { useSampleData: true } }),
  ]);

  const recentItems = [
    ...assets.map((a) => ({
      id: a.id,
      label: (a.url ?? a.type).split("/").pop() ?? a.type,
      href: `/dashboard/brand?r=${restaurantId}`,
      kind: a.type.replace(/_/g, " ").toLowerCase(),
    })),
    ...content.map((c) => ({
      id: c.id,
      label: c.prompt.slice(0, 48),
      href: `/dashboard/content?r=${restaurantId}`,
      kind: "content",
    })),
    ...tasks.map((t) => ({
      id: t.id,
      label: t.title,
      href: `/dashboard?r=${restaurantId}`,
      kind: "task",
    })),
  ].slice(0, 8);

  return (
    <Suspense>
      <WorkspaceHub
        restaurantId={restaurantId}
        recentItems={recentItems}
        pins={pins}
        useSampleData={restaurantRow?.useSampleData ?? false}
        connectedProviders={integrations.map((i) => i.provider)}
      />
    </Suspense>
  );
}
