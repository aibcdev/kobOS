import type { Prisma } from "@prisma/client";
import { recomputeGuestStats } from "@/lib/commerce/guests";
import { rebuildSalesSnapshots, snapshotSourceFor } from "@/lib/commerce/sales-snapshot";
import { prisma } from "@/lib/db/prisma";

/**
 * What happens to a provider's synced data after Disconnect (UK/EU GDPR storage limitation).
 *  - KEEP_TOTALS (default): sales history stays so weekly reports don't change, but guests' personal details from
 *    that provider (emails, phones, provider customer ids, names nobody else supplied) are removed after 30 days.
 *  - DELETE_ALL: everything that provider brought in goes now: orders, bookings, menu links, guests, and its days
 *    in the sales totals.
 */
export type DisconnectMode = "KEEP_TOTALS" | "DELETE_ALL";
export const PII_GRACE_DAYS = 30;
const DAY_MS = 86_400_000;

type Retention = { mode: DisconnectMode; disconnectedAt: string; purgeAfter: string | null; purgedAt?: string };

export function retentionOf(metadata: Prisma.JsonValue | null | undefined): Retention | null {
  const r = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? (metadata as Record<string, unknown>).retention : null;
  return r && typeof r === "object" ? (r as Retention) : null;
}

export function retentionPlan(mode: DisconnectMode, now: Date): Retention {
  return {
    mode,
    disconnectedAt: now.toISOString(),
    purgeAfter: mode === "KEEP_TOTALS" ? new Date(now.getTime() + PII_GRACE_DAYS * DAY_MS).toISOString() : null,
  };
}

/** Removes the provider's identities; guests left with no identity lose their name, and empty guests are deleted. */
async function purgeGuestPii(restaurantId: string, provider: string, opts: { deleteEmptyGuests: boolean }): Promise<string[]> {
  const affected = await prisma.guestIdentity.findMany({ where: { restaurantId, provider }, select: { guestId: true }, distinct: ["guestId"] });
  const guestIds = affected.map((a) => a.guestId);
  if (!guestIds.length) return [];
  await prisma.guestIdentity.deleteMany({ where: { restaurantId, provider } });
  const orphaned = await prisma.guest.findMany({ where: { id: { in: guestIds }, identities: { none: {} } }, select: { id: true } });
  const orphanIds = orphaned.map((g) => g.id);
  if (orphanIds.length) {
    await prisma.guest.updateMany({ where: { id: { in: orphanIds } }, data: { displayName: null } });
    if (opts.deleteEmptyGuests) await prisma.guest.deleteMany({ where: { id: { in: orphanIds }, orders: { none: {} }, bookings: { none: {} } } });
  }
  return guestIds;
}

export async function deleteProviderData(restaurantId: string, provider: string): Promise<{ orders: number; bookings: number; guests: number }> {
  const range = await prisma.order.aggregate({ where: { restaurantId, sourceProvider: provider }, _min: { placedAt: true }, _max: { placedAt: true } });
  const linked = await prisma.order.findMany({ where: { restaurantId, sourceProvider: provider, guestId: { not: null } }, select: { guestId: true }, distinct: ["guestId"] });
  const orders = await prisma.order.deleteMany({ where: { restaurantId, sourceProvider: provider } });
  const bookings = await prisma.booking.deleteMany({ where: { restaurantId, sourceProvider: provider } });
  await prisma.menuItemLink.deleteMany({ where: { restaurantId, provider } });
  const before = await prisma.guest.count({ where: { restaurantId } });
  const touched = await purgeGuestPii(restaurantId, provider, { deleteEmptyGuests: true });
  const guests = before - (await prisma.guest.count({ where: { restaurantId } }));
  const remaining = await prisma.guest.findMany({ where: { id: { in: [...touched, ...linked.map((l) => l.guestId!)] } }, select: { id: true } });
  await recomputeGuestStats(remaining.map((g) => g.id));
  const source = snapshotSourceFor("API", provider);
  if (range._min.placedAt && range._max.placedAt) {
    await rebuildSalesSnapshots(restaurantId, range._min.placedAt, range._max.placedAt, source ? [source] : []);
  }
  return { orders: orders.count, bookings: bookings.count, guests };
}

/** Daily: KEEP_TOTALS disconnects past their grace period lose the provider's guest personal details. */
export async function retentionSweep(now = new Date()): Promise<{ purged: number }> {
  const rows = await prisma.integration.findMany({ where: { status: "DISCONNECTED" }, select: { id: true, restaurantId: true, provider: true, metadata: true } });
  let purged = 0;
  for (const row of rows) {
    const r = retentionOf(row.metadata);
    if (!r || r.purgedAt || r.mode !== "KEEP_TOTALS" || !r.purgeAfter || new Date(r.purgeAfter) > now) continue;
    await purgeGuestPii(row.restaurantId, row.provider, { deleteEmptyGuests: false });
    const metadata = { ...((row.metadata ?? {}) as Record<string, unknown>), retention: { ...r, purgedAt: now.toISOString() } };
    await prisma.integration.update({ where: { id: row.id }, data: { metadata } });
    purged += 1;
  }
  return { purged };
}
