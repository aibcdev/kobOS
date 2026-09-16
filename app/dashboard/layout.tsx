import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ensureAppUser } from "@/lib/auth/ensure-user";
import { withTimeout } from "@/lib/auth/with-timeout";
import { ensureSalesWorkspaceMembership } from "@/lib/outbound/ensure-sales-membership";
import { isOutboundSalesMode } from "@/lib/outbound/sales-access";
import { prisma } from "@/lib/db/prisma";
import { isUiPreviewEnabled, PREVIEW_RESTAURANT_ID } from "@/lib/preview/ui-preview";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Avoid build-time prerender: dashboard uses cookies, Supabase, and Prisma. */
export const dynamic = "force-dynamic";

const PROFILE_BUDGET_MS = 6_000;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let user: { id: string; email?: string | null } | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user: authed },
    } = await supabase.auth.getUser();
    user = authed;
  } catch {
    user = null;
  }

  if (isUiPreviewEnabled() || !user) {
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

  // Soft-timeout profile setup so a cold DB cannot freeze the post-login paint.
  try {
    await withTimeout(
      Promise.all([
        ensureAppUser(user),
        ensureSalesWorkspaceMembership(user.id, user.email),
      ]),
      PROFILE_BUDGET_MS,
      "dashboard_layout_profile_timeout",
    );
  } catch (err) {
    console.error("[dashboard/layout] profile setup", err);
  }

  let restaurants: {
    id: string;
    name: string;
    city: string | null;
    logo: string | null;
    openRequests: number;
  }[] = [];

  try {
    const memberships = await withTimeout(
      prisma.teamMember.findMany({
        where: { userId: user.id },
        include: { restaurant: true },
        orderBy: { createdAt: "asc" },
      }),
      PROFILE_BUDGET_MS,
      "dashboard_layout_memberships_timeout",
    );

    const restaurantIds = memberships.map((m) => m.restaurant.id);
    const openRequests = restaurantIds.length
      ? await withTimeout(
          prisma.serviceRequest.groupBy({
            by: ["restaurantId"],
            where: {
              restaurantId: { in: restaurantIds },
              status: { in: ["REQUESTED", "IN_PROGRESS", "DRAFTS_READY", "APPROVED"] },
            },
            _count: { id: true },
          }),
          PROFILE_BUDGET_MS,
          "dashboard_layout_requests_timeout",
        )
      : [];
    const openByRestaurant = new Map(openRequests.map((row) => [row.restaurantId, row._count.id]));

    restaurants = memberships.map((m) => ({
      id: m.restaurant.id,
      name: m.restaurant.name,
      city: m.restaurant.city,
      logo: m.restaurant.logo,
      openRequests: openByRestaurant.get(m.restaurant.id) ?? 0,
    }));
  } catch (err) {
    console.error("[dashboard/layout] memberships", err);
  }

  return (
    <Suspense>
      <DashboardShell restaurants={restaurants} userEmail={user.email} salesMode={isOutboundSalesMode()}>
        {children}
      </DashboardShell>
    </Suspense>
  );
}
