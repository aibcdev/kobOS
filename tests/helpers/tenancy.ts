import { expect } from "vitest";

/**
 * Cross-tenant test kit. In the test file:
 *   vi.mock("@/lib/supabase/server", async () => (await import("@/tests/helpers/tenancy")).supabaseAsTenant());
 *   vi.mock("@/lib/auth/ensure-user", async () => (await import("@/tests/helpers/tenancy")).ensureUserNoop());
 *   vi.mock("@/lib/db/prisma", async () => (await import("@/tests/helpers/tenancy")).prismaForTenant());
 * then `await expectForbiddenForOtherTenant((restaurantId) => POST(...))`.
 */
export const TENANT = {
  userId: "00000000-0000-4000-8000-00000000000a",
  ownRestaurantId: "restaurant-a-0000000001",
  otherRestaurantId: "restaurant-b-0000000002",
} as const;

export function supabaseAsTenant() {
  const user = { id: TENANT.userId, email: "owner-a@example.com" };
  return {
    createSupabaseServerClient: async () => ({
      auth: { getUser: async () => ({ data: { user }, error: null }) },
    }),
  };
}

export function ensureUserNoop() {
  return { ensureAppUser: async () => undefined };
}

/** Prisma stub where the tenant is a member of their own restaurant only. Other models throw if reached. */
export function prismaForTenant() {
  type Where = { where: { userId_restaurantId: { userId: string; restaurantId: string } } };
  const findUnique = async ({ where: { userId_restaurantId: k } }: Where) =>
    k.userId === TENANT.userId && k.restaurantId === TENANT.ownRestaurantId
      ? { id: "member-a", userId: k.userId, restaurantId: k.restaurantId, role: "OWNER", restaurant: { id: k.restaurantId } }
      : null;
  const prisma = new Proxy({ teamMember: { findUnique } } as Record<string, unknown>, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      throw new Error(`tenancy test reached prisma.${prop} for a foreign restaurant`);
    },
  });
  return { prisma };
}

/** The route must refuse (403/404) when the signed-in owner names another restaurant. */
export async function expectForbiddenForOtherTenant(call: (restaurantId: string) => Promise<Response>) {
  const res = await call(TENANT.otherRestaurantId);
  expect([403, 404]).toContain(res.status);
}
