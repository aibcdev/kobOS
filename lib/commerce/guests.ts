import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { encryptSecret } from "@/lib/crypto/tokens";
import { isPiiHash, legacyHashIfUpgraded, piiHash } from "@/lib/hub/webhooks/minimise";

type Tx = Prisma.TransactionClient;

export type IdentityKind = "EMAIL" | "PHONE" | "PROVIDER_CUSTOMER";

export type GuestIdentityInput = {
  kind: IdentityKind;
  /** Raw email / phone / provider customer id, or an already-hashed `hmac:` / `sha256:` value from a minimised payload. */
  value: string;
  provider?: string;
};

export type GuestInput = { displayName?: string | null; identities: GuestIdentityInput[] };

/** Digits only with a leading +, so "+44 7700 900123" and "+447700900123" match. */
function normalisePhone(value: string): string {
  const digits = value.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? `+${digits.slice(1).replace(/\+/g, "")}` : digits;
}

const piiValue = (input: GuestIdentityInput) => (input.kind === "PHONE" ? normalisePhone(input.value) : input.value);

export function identityHash(input: GuestIdentityInput): string {
  if (input.kind === "PROVIDER_CUSTOMER") {
    if (!input.provider) throw new Error("PROVIDER_CUSTOMER identities need a provider");
    return `${input.provider}:${input.value}`;
  }
  if (isPiiHash(input.value)) return input.value;
  return piiHash(piiValue(input));
}

/** The unkeyed hash this identity was stored under before PII_HASH_KEY, so old rows still match and get upgraded. */
function legacyHash(input: GuestIdentityInput): string | null {
  return input.kind === "PROVIDER_CUSTOMER" ? null : legacyHashIfUpgraded(piiValue(input));
}

function maybeEncrypt(input: GuestIdentityInput): string | null {
  if (input.kind === "PROVIDER_CUSTOMER" || isPiiHash(input.value) || !process.env.INTEGRATION_ENC_KEY) return null;
  return encryptSecret(input.kind === "PHONE" ? normalisePhone(input.value) : input.value.trim());
}

function usable(identities: GuestIdentityInput[]): GuestIdentityInput[] {
  return identities.filter((i) => i.value && i.value.trim());
}

/** Moves everything onto the oldest guest; the others keep a `mergedIntoId` pointer and no identities. */
async function mergeGuests(tx: Tx, guestIds: string[]): Promise<string> {
  const guests = await tx.guest.findMany({ where: { id: { in: guestIds } }, orderBy: { createdAt: "asc" }, select: { id: true, displayName: true } });
  const [survivor, ...rest] = guests;
  const restIds = rest.map((g) => g.id);
  if (!restIds.length) return survivor.id;
  await tx.guestIdentity.updateMany({ where: { guestId: { in: restIds } }, data: { guestId: survivor.id } });
  await tx.guestConsent.updateMany({ where: { guestId: { in: restIds } }, data: { guestId: survivor.id } });
  await tx.order.updateMany({ where: { guestId: { in: restIds } }, data: { guestId: survivor.id } });
  await tx.booking.updateMany({ where: { guestId: { in: restIds } }, data: { guestId: survivor.id } });
  await tx.guest.updateMany({ where: { id: { in: restIds } }, data: { mergedIntoId: survivor.id } });
  if (!survivor.displayName) {
    const name = rest.find((g) => g.displayName)?.displayName;
    if (name) await tx.guest.update({ where: { id: survivor.id }, data: { displayName: name } });
  }
  return survivor.id;
}

/**
 * Finds or creates the guest these identities belong to, attaching any new identities. If they point at more than one
 * existing guest (same email on a Square customer and a booking), those guests are merged.
 * Returns null when there is nothing to identify the guest by.
 */
export async function resolveGuest(tx: Tx, restaurantId: string, input: GuestInput): Promise<string | null> {
  const identities = usable(input.identities);
  if (!identities.length) return null;
  const rows = identities.map((i) => ({ kind: i.kind, provider: i.provider ?? null, valueHash: identityHash(i), encryptedValue: maybeEncrypt(i) }));
  const legacy = identities.flatMap((i) => {
    const valueHash = legacyHash(i);
    return valueHash ? [{ kind: i.kind, valueHash }] : [];
  });
  const match = () =>
    tx.guestIdentity.findMany({
      where: { restaurantId, OR: [...rows.map((r) => ({ kind: r.kind, valueHash: r.valueHash })), ...legacy] },
      select: { guestId: true },
    });

  let guestIds = [...new Set((await match()).map((m) => m.guestId))];
  let guestId = guestIds.length > 1 ? await mergeGuests(tx, guestIds) : guestIds[0];
  if (!guestId) {
    guestId = (await tx.guest.create({ data: { restaurantId, displayName: input.displayName ?? null } })).id;
  } else if (input.displayName) {
    await tx.guest.updateMany({ where: { id: guestId, displayName: null }, data: { displayName: input.displayName } });
  }
  await tx.guestIdentity.createMany({ data: rows.map((r) => ({ ...r, restaurantId, guestId })), skipDuplicates: true });

  // A concurrent writer may have claimed one of these identities for a different guest between the read and the insert.
  guestIds = [...new Set((await match()).map((m) => m.guestId))];
  const resolved = guestIds.length > 1 ? await mergeGuests(tx, guestIds) : guestId;
  // The keyed row now exists on the same guest, so the unkeyed copy can go.
  if (legacy.length) await tx.guestIdentity.deleteMany({ where: { restaurantId, OR: legacy } });
  return resolved;
}

const SPEND_STATUSES = ["COMPLETED", "REFUNDED"];
const VISIT_BOOKING_STATUSES = ["SEATED", "COMPLETED"];

/** Visit count = distinct UTC days with a paid order or an honoured booking, so a booking and its bill count once. */
export async function recomputeGuestStats(guestIds: Iterable<string>): Promise<void> {
  for (const id of new Set(guestIds)) {
    const [orders, bookings] = await Promise.all([
      prisma.order.findMany({
        where: { guestId: id, status: { in: SPEND_STATUSES } },
        select: { placedAt: true, totalMinor: true, refundedMinor: true, currency: true },
        orderBy: { placedAt: "asc" },
      }),
      prisma.booking.findMany({ where: { guestId: id, status: { in: VISIT_BOOKING_STATUSES } }, select: { startsAt: true } }),
    ]);
    const currency = orders[0]?.currency ?? null;
    const dates = [...orders.map((o) => o.placedAt), ...bookings.map((b) => b.startsAt)].sort((a, b) => a.getTime() - b.getTime());
    await prisma.guest.update({
      where: { id },
      data: {
        visitCount: new Set(dates.map((d) => d.toISOString().slice(0, 10))).size,
        totalSpendMinor: orders.filter((o) => o.currency === currency).reduce((s, o) => s + o.totalMinor - o.refundedMinor, 0),
        currency,
        firstSeenAt: dates[0] ?? null,
        lastSeenAt: dates[dates.length - 1] ?? null,
      },
    });
  }
}
