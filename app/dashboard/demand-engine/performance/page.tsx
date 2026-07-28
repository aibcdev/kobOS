import { redirect } from "next/navigation";

import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { withRestaurantQuery } from "@/lib/dashboard/nav";

export default async function DemandPerformanceRedirect({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId } = await getActiveRestaurantContext(userId, sp.r);
  redirect(withRestaurantQuery("/dashboard/demand-engine", restaurantId));
}
