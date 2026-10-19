import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { SourceKind } from "@/lib/hub/source-ref";
import { recomputeGuestStats, resolveGuest, type GuestInput } from "@/lib/commerce/guests";
import { rebuildSalesSnapshots } from "@/lib/commerce/sales-snapshot";

export type FactSource = { kind: SourceKind; provider: string; externalId: string; importJobId?: string | null };

export type OrderStatus = "OPEN" | "COMPLETED" | "CANCELLED" | "REFUNDED";
export type OrderChannel = "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "ONLINE" | "UNKNOWN";

export type OrderLineInput = {
  externalId?: string | null;
  /** Provider catalog item id; linked to MenuItemLink when one exists for the same provider. */
  catalogExternalId?: string | null;
  name: string;
  quantity: number;
  unitPriceMinor: number;
  totalMinor?: number;
  modifiers?: unknown[];
};

export type OrderInput = {
  source: FactSource;
  status: OrderStatus;
  channel?: OrderChannel;
  placedAt: Date;
  closedAt?: Date | null;
  currency: string;
  subtotalMinor?: number;
  discountMinor?: number;
  taxMinor?: number;
  tipMinor?: number;
  serviceChargeMinor?: number;
  totalMinor: number;
  refundedMinor?: number;
  externalLocationId?: string | null;
  guest?: GuestInput | null;
  lines?: OrderLineInput[];
};

export type BookingStatus = "BOOKED" | "SEATED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export type BookingInput = {
  source: FactSource;
  startsAt: Date;
  partySize: number;
  status: BookingStatus;
  channel?: "PHONE" | "WEB" | "WALK_IN" | "THIRD_PARTY" | "UNKNOWN";
  depositMinor?: number | null;
  currency?: string | null;
  externalLocationId?: string | null;
  guest?: GuestInput | null;
};

export type CatalogItemInput = {
  externalId: string;
  name: string;
  category?: string | null;
  priceMinor?: number | null;
  currency?: string | null;
  active?: boolean;
};

function sourceColumns(s: FactSource) {
  return { sourceKind: s.kind, sourceProvider: s.provider, sourceExternalId: s.externalId, sourceImportJobId: s.importJobId ?? null };
}

export type IngestResult = { upserted: number; guestIds: string[]; from: Date | null; to: Date | null };

/**
 * Idempotent: re-sending an order (webhook replay, overlapping sync page, re-imported file) updates it in place and
 * replaces its lines. After the batch, touched guests' stats and the touched days' SalesSnapshot rows are rebuilt.
 */
export async function ingestOrders(restaurantId: string, orders: OrderInput[]): Promise<IngestResult> {
  const guestIds = new Set<string>();
  let from: Date | null = null;
  let to: Date | null = null;

  for (const o of orders) {
    const { ids, previousPlacedAt } = await prisma.$transaction(async (tx) => {
      const gid = o.guest ? await resolveGuest(tx, restaurantId, o.guest) : null;
      const data = {
        guestId: gid,
        channel: o.channel ?? "UNKNOWN",
        status: o.status,
        placedAt: o.placedAt,
        closedAt: o.closedAt ?? null,
        currency: o.currency.toUpperCase(),
        subtotalMinor: o.subtotalMinor ?? 0,
        discountMinor: o.discountMinor ?? 0,
        taxMinor: o.taxMinor ?? 0,
        tipMinor: o.tipMinor ?? 0,
        serviceChargeMinor: o.serviceChargeMinor ?? 0,
        totalMinor: o.totalMinor,
        refundedMinor: o.refundedMinor ?? 0,
        externalLocationId: o.externalLocationId ?? null,
        ...sourceColumns(o.source),
      };
      const existing = await tx.order.findUnique({
        where: { restaurantId_sourceProvider_sourceExternalId: { restaurantId, sourceProvider: o.source.provider, sourceExternalId: o.source.externalId } },
        select: { id: true, guestId: true, placedAt: true },
      });
      // An update without guest details (e.g. a refund webhook) keeps the guest already linked.
      if (existing && !gid) data.guestId = existing.guestId;
      const order = existing
        ? await tx.order.update({ where: { id: existing.id }, data })
        : await tx.order.create({ data: { restaurantId, ...data } });

      if (o.lines) {
        const catalogIds = [...new Set(o.lines.map((l) => l.catalogExternalId).filter((x): x is string => !!x))];
        const links = catalogIds.length
          ? await tx.menuItemLink.findMany({ where: { restaurantId, provider: o.source.provider, externalId: { in: catalogIds } }, select: { id: true, externalId: true } })
          : [];
        const linkId = new Map(links.map((l) => [l.externalId, l.id]));
        await tx.orderLine.deleteMany({ where: { orderId: order.id } });
        await tx.orderLine.createMany({
          data: o.lines.map((l) => ({
            restaurantId,
            orderId: order.id,
            menuItemLinkId: l.catalogExternalId ? (linkId.get(l.catalogExternalId) ?? null) : null,
            externalId: l.externalId ?? null,
            name: l.name,
            quantity: new Prisma.Decimal(l.quantity),
            unitPriceMinor: l.unitPriceMinor,
            totalMinor: l.totalMinor ?? Math.round(l.unitPriceMinor * l.quantity),
            modifiersJson: (l.modifiers ?? []) as Prisma.InputJsonValue,
          })),
        });
      }
      return { ids: [order.guestId, existing?.guestId].filter((x): x is string => !!x), previousPlacedAt: existing?.placedAt ?? null };
    });
    ids.forEach((g) => guestIds.add(g));
    for (const at of [o.placedAt, previousPlacedAt]) {
      if (!at) continue;
      if (!from || at < from) from = at;
      if (!to || at > to) to = at;
    }
  }

  await recomputeGuestStats(guestIds);
  if (from && to) await rebuildSalesSnapshots(restaurantId, from, to);
  return { upserted: orders.length, guestIds: [...guestIds], from, to };
}

export async function ingestBookings(restaurantId: string, bookings: BookingInput[]): Promise<IngestResult> {
  const guestIds = new Set<string>();
  let from: Date | null = null;
  let to: Date | null = null;
  for (const b of bookings) {
    const ids = await prisma.$transaction(async (tx) => {
      const gid = b.guest ? await resolveGuest(tx, restaurantId, b.guest) : null;
      const key = { restaurantId, sourceProvider: b.source.provider, sourceExternalId: b.source.externalId };
      const existing = await tx.booking.findUnique({ where: { restaurantId_sourceProvider_sourceExternalId: key }, select: { guestId: true } });
      const data = {
        guestId: gid ?? existing?.guestId ?? null,
        startsAt: b.startsAt,
        partySize: b.partySize,
        status: b.status,
        channel: b.channel ?? "UNKNOWN",
        depositMinor: b.depositMinor ?? null,
        currency: b.currency?.toUpperCase() ?? null,
        externalLocationId: b.externalLocationId ?? null,
        ...sourceColumns(b.source),
      };
      await tx.booking.upsert({ where: { restaurantId_sourceProvider_sourceExternalId: key }, create: { restaurantId, ...data }, update: data });
      return [data.guestId, existing?.guestId].filter((x): x is string => !!x);
    });
    ids.forEach((g) => guestIds.add(g));
    if (!from || b.startsAt < from) from = b.startsAt;
    if (!to || b.startsAt > to) to = b.startsAt;
  }
  await recomputeGuestStats(guestIds);
  return { upserted: bookings.length, guestIds: [...guestIds], from, to };
}

/** POS customer lists: creates or enriches guests without touching orders. */
export async function ingestGuests(restaurantId: string, guests: GuestInput[]): Promise<number> {
  let n = 0;
  for (const g of guests) {
    const id = await prisma.$transaction((tx) => resolveGuest(tx, restaurantId, g));
    if (id) n += 1;
  }
  return n;
}

/**
 * Upserts a provider's catalog. New links are matched to an existing menu item by exact (case-insensitive) name;
 * links an owner has already matched keep their match.
 */
export async function upsertCatalog(restaurantId: string, provider: string, items: CatalogItemInput[], now = new Date()): Promise<number> {
  if (!items.length) return 0;
  const menu = await prisma.osMenuItem.findMany({ where: { restaurantId }, select: { id: true, name: true } });
  const byName = new Map(menu.map((m) => [m.name.trim().toLowerCase(), m.id]));
  for (const item of items) {
    const data = {
      externalName: item.name,
      category: item.category ?? null,
      priceMinor: item.priceMinor ?? null,
      currency: item.currency?.toUpperCase() ?? null,
      active: item.active ?? true,
      lastSeenAt: now,
    };
    await prisma.menuItemLink.upsert({
      where: { restaurantId_provider_externalId: { restaurantId, provider, externalId: item.externalId } },
      create: { restaurantId, provider, externalId: item.externalId, menuItemId: byName.get(item.name.trim().toLowerCase()) ?? null, ...data },
      update: data,
    });
  }
  return items.length;
}
