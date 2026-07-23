import type { User } from "@supabase/supabase-js";
import type { Prisma, Restaurant } from "@prisma/client";

/** Set `NEXT_PUBLIC_UI_PREVIEW=1` in `.env.local` to browse the dashboard without Supabase or Postgres. */
export function isUiPreviewEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_UI_PREVIEW;
  return v === "1" || v === "true";
}

/** Must be a valid UUID (TeamMember.userId is @db.Uuid). */
export const PREVIEW_USER_ID = "00000000-0000-4000-8000-000000000001";

export const PREVIEW_RESTAURANT_ID = "clpreviewrestaurant0001";

export function getPreviewUser(): User {
  const now = new Date().toISOString();
  return {
    id: PREVIEW_USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "preview@kob.local",
    email_confirmed_at: now,
    phone: "",
    confirmed_at: now,
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: now,
    updated_at: now,
    is_anonymous: false,
  } as User;
}

export function getPreviewRestaurant(): Restaurant {
  return {
    id: PREVIEW_RESTAURANT_ID,
    organizationId: null,
    name: "Demo Restaurant",
    slug: "demo-restaurant",
    cuisineType: "American",
    city: "Austin",
    state: "TX",
    timezone: "America/Chicago",
    website: "https://example.com",
    logo: null,
    subscriptionPlan: "PRO",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    vibe: null,
    googleBusinessUrl: null,
    aiPersonality: "BALANCED",
    useSampleData: true,
    creditBalance: 0,
    creditsRefreshedAt: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

export type MembershipWithRestaurant = Prisma.TeamMemberGetPayload<{
  include: { restaurant: true };
}>;

export function getPreviewMemberships(): MembershipWithRestaurant[] {
  const restaurant = getPreviewRestaurant();
  return [
    {
      id: "clpreviewteammember0001",
      userId: PREVIEW_USER_ID,
      restaurantId: PREVIEW_RESTAURANT_ID,
      role: "OWNER",
      createdAt: new Date(0),
      restaurant,
    },
  ];
}
