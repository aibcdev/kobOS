import { randomUUID } from "node:crypto";
import { describe } from "vitest";
import type { PrismaClient } from "@prisma/client";

/** Postgres-backed tests run only when TEST_DATABASE_URL points at a migrated database (CI db job). */
export const TEST_DB = process.env.TEST_DATABASE_URL;
export const describeDb = describe.skipIf(!TEST_DB);

/**
 * Prisma reads DATABASE_URL when the client is constructed, so point it at the test database before any import:
 *   vi.hoisted(() => { if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL; });
 */

export async function seedRestaurant(prisma: PrismaClient, opts: { role?: "OWNER" | "ADMIN" | "MEMBER" } = {}) {
  const suffix = randomUUID().slice(0, 8);
  const userId = randomUUID();
  const restaurant = await prisma.restaurant.create({ data: { name: `Test ${suffix}`, slug: `test-${suffix}` } });
  await prisma.user.create({ data: { id: userId, email: `owner-${suffix}@example.com` } });
  await prisma.teamMember.create({ data: { userId, restaurantId: restaurant.id, role: opts.role ?? "OWNER" } });
  return { restaurant, userId };
}
