import { RestaurantPlacesOnboarding } from "@/components/dashboard/RestaurantPlacesOnboarding";

/** Sub-pages with no venue: same Places-first empty state as Today. */
export function DashboardEmptyRestaurant() {
  return <RestaurantPlacesOnboarding variant="empty" />;
}
