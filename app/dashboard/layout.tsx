import { Suspense } from "react";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ensureAppUser } from "@/lib/auth/ensure-user";
import { ensureSalesWorkspaceMembership } from "@/lib/outbound/ensure-sales-membership";
import { isOutboundSalesMode } from "@/lib/outbound/sales-access";
import { prisma } from "@/lib/db/prisma";
import { isUiPreviewEnabled, PREVIEW_RESTAURANT_ID } from "@/lib/preview/ui-preview";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Avoid build-time prerender: dashboard uses cookies, Supabase, and Prisma. */
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (isUiPreviewEnabled()) {
    const restaurants = [
      {
        id: PREVIEW_RESTAURANT_ID,
        name: "Demo Restaurant",
        city: "Austin",
      },
    ];
    return (
      <Suspense>
        <DashboardShell restaurants={restaurants} salesMode={isOutboundSalesMode()}>
          {children}
        </DashboardShell>
      </Suspense>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensureAppUser(user);
  await ensureSalesWorkspaceMembership(user.id, user.email);

  const memberships = await prisma.teamMember.findMany({
    where: { userId: user.id },
    include: { restaurant: true },
    orderBy: { createdAt: "asc" },
  });

  const restaurantIds = memberships.map((m) => m.restaurant.id);
  const openRequests = restaurantIds.length
    ? await prisma.serviceRequest.groupBy({
        by: ["restaurantId"],
        where: { restaurantId: { in: restaurantIds }, status: { in: ["REQUESTED", "IN_PROGRESS"] } },
        _count: { id: true },
      })
    : [];
  const openByRestaurant = new Map(openRequests.map((row) => [row.restaurantId, row._count.id]));

  const restaurants = memberships.map((m) => ({
    id: m.restaurant.id,
    name: m.restaurant.name,
    city: m.restaurant.city,
    logo: m.restaurant.logo,
    openRequests: openByRestaurant.get(m.restaurant.id) ?? 0,
  }));

  return (
    <Suspense>
      <DashboardShell restaurants={restaurants} userEmail={user.email} salesMode={isOutboundSalesMode()}>
        {children}
      </DashboardShell>
    </Suspense>
  );
}
