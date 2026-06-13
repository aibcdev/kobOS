import type { Metadata } from "next";
import { ChatWorkspace } from "@/components/dashboard/chat/ChatWorkspace";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";

export const metadata: Metadata = {
  title: "Chat · KOB",
  description: "Talk to your restaurant assistant.",
};

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ r?: string; c?: string }> }) {
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  return (
    <div>
      <div className="border-b border-[var(--color-hairline)] px-4 py-4">
        <h1 className="type-title-md">Chief of Staff</h1>
        <p className="type-body-sm mt-1 text-[var(--color-muted)]">
          Run marketing, socials, and daily tasks for {restaurant.name}.
        </p>
      </div>
      <ChatWorkspace restaurantId={restaurantId} initialConversationId={sp.c} />
    </div>
  );
}
