import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ensureAppUser } from "@/lib/auth/ensure-user";
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
    return <DashboardShell restaurants={restaurants}>{children}</DashboardShell>;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensureAppUser(user);

  const memberships = await prisma.teamMember.findMany({
    where: { userId: user.id },
    include: { restaurant: true },
    orderBy: { createdAt: "asc" },
  });

  const restaurants = memberships.map((m) => ({
    id: m.restaurant.id,
    name: m.restaurant.name,
    city: m.restaurant.city,
  }));

  return <DashboardShell restaurants={restaurants}>{children}</DashboardShell>;
}
