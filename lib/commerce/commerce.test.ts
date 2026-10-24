import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { describeDb, seedRestaurant } from "@/tests/helpers/db";
import type { OrderInput } from "@/lib/commerce/ingest";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});

describeDb("unified commerce on Postgres (T-87)", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let ingest: typeof import("@/lib/commerce/ingest");
  let restaurantId: string;

  const order = (id: string, over: Partial<OrderInput> = {}): OrderInput => ({
    source: { kind: "API", provider: "SQUARE", externalId: id },
    status: "COMPLETED",
    channel: "DINE_IN",
    placedAt: new Date("2026-10-14T12:00:00Z"),
    currency: "gbp",
    totalMinor: 2500,
    ...over,
  });
  const snapshots = () =>
    prisma.salesSnapshot.findMany({ where: { restaurantId }, orderBy: [{ date: "asc" }, { source: "asc" }], select: { date: true, source: true, revenueCents: true, orderCount: true } });
  const day = (s: string) => new Date(`${s}T00:00:00Z`);

  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
    ingest = await import("@/lib/commerce/ingest");
    restaurantId = (await seedRestaurant(prisma)).restaurant.id;
    await prisma.restaurant.update({ where: { id: restaurantId }, data: { timezone: "Europe/London" } });
  });
  afterAll(async () => {
    await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    vi.unstubAllEnvs();
    await prisma.order.deleteMany({ where: { restaurantId } });
    await prisma.booking.deleteMany({ where: { restaurantId } });
    await prisma.guest.deleteMany({ where: { restaurantId } });
    await prisma.salesSnapshot.deleteMany({ where: { restaurantId } });
    await prisma.menuItemLink.deleteMany({ where: { restaurantId } });
    await prisma.osMenuItem.deleteMany({ where: { restaurantId } });
  });

  it("is idempotent on replay and replaces lines", async () => {
    const lines = [{ name: "Flat white", quantity: 2, unitPriceMinor: 350 }];
    await ingest.ingestOrders(restaurantId, [order("sq-1", { lines })]);
    await ingest.ingestOrders(restaurantId, [order("sq-1", { lines: [...lines, { name: "Croissant", quantity: 1, unitPriceMinor: 300 }] })]);
    const rows = await prisma.order.findMany({ where: { restaurantId }, include: { lines: true } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ currency: "GBP", sourceKind: "API", sourceProvider: "SQUARE", sourceExternalId: "sq-1" });
    expect(rows[0].lines.map((l) => [l.name, Number(l.quantity), l.totalMinor])).toEqual([
      ["Flat white", 2, 700],
      ["Croissant", 1, 300],
    ]);
    expect(await snapshots()).toEqual([{ date: day("2026-10-14"), source: "SQUARE", revenueCents: 2500, orderCount: 1 }]);
  });

  it("buckets by the restaurant's local day, nets refunds, and ignores open/cancelled orders", async () => {
    await ingest.ingestOrders(restaurantId, [
      order("a", { placedAt: new Date("2026-10-14T23:30:00Z") }), // 00:30 BST on the 15th
      order("b", { placedAt: new Date("2026-10-15T10:00:00Z"), status: "REFUNDED", refundedMinor: 500 }),
      order("c", { placedAt: new Date("2026-10-15T11:00:00Z"), status: "OPEN" }),
      order("d", { placedAt: new Date("2026-10-15T12:00:00Z"), status: "CANCELLED" }),
    ]);
    expect(await snapshots()).toEqual([{ date: day("2026-10-15"), source: "SQUARE", revenueCents: 4500, orderCount: 2 }]);
  });

  it("moves revenue off the old day when a replayed order changes date", async () => {
    await ingest.ingestOrders(restaurantId, [order("m")]);
    await ingest.ingestOrders(restaurantId, [order("m", { placedAt: new Date("2026-10-16T12:00:00Z") })]);
    expect(await snapshots()).toEqual([{ date: day("2026-10-16"), source: "SQUARE", revenueCents: 2500, orderCount: 1 }]);
  });

  it("leaves SAMPLE rows alone and splits imports into their own bucket", async () => {
    await prisma.salesSnapshot.create({ data: { restaurantId, date: day("2026-10-14"), source: "SAMPLE", revenueCents: 1, orderCount: 1 } });
    await ingest.ingestOrders(restaurantId, [
      order("x"),
      order("deliveroo-1", { source: { kind: "FILE_IMPORT", provider: "DELIVEROO_CSV", externalId: "deliveroo-1" }, channel: "DELIVERY", totalMinor: 1800 }),
    ]);
    expect(await snapshots()).toEqual([
      { date: day("2026-10-14"), source: "SQUARE", revenueCents: 2500, orderCount: 1 },
      { date: day("2026-10-14"), source: "SAMPLE", revenueCents: 1, orderCount: 1 },
      { date: day("2026-10-14"), source: "IMPORT", revenueCents: 1800, orderCount: 1 },
    ]);
  });

  it("stores only hashes of contact details unless the encryption key is set", async () => {
    await ingest.ingestOrders(restaurantId, [
      order("g1", { guest: { displayName: "Ada", identities: [{ kind: "EMAIL", value: " Ada@Example.com " }, { kind: "PROVIDER_CUSTOMER", provider: "SQUARE", value: "CUST1" }] } }),
    ]);
    const ids = await prisma.guestIdentity.findMany({ where: { restaurantId }, orderBy: { kind: "asc" } });
    expect(ids.map((i) => [i.kind, i.valueHash.startsWith("sha256:") || i.valueHash === "SQUARE:CUST1", i.encryptedValue])).toEqual([
      ["EMAIL", true, null],
      ["PROVIDER_CUSTOMER", true, null],
    ]);
    expect(JSON.stringify(ids)).not.toContain("example.com");

    vi.stubEnv("INTEGRATION_ENC_KEY", Buffer.alloc(32, 7).toString("base64"));
    await ingest.ingestOrders(restaurantId, [order("g2", { guest: { identities: [{ kind: "PHONE", value: "+44 7700 900123" }] } })]);
    const phone = await prisma.guestIdentity.findFirstOrThrow({ where: { restaurantId, kind: "PHONE" } });
    expect(phone.encryptedValue).toMatch(/^v1:/);
    const { decryptSecret } = await import("@/lib/crypto/tokens");
    expect(decryptSecret(phone.encryptedValue!)).toBe("+447700900123");
  });

  it("keys contact hashes with PII_HASH_KEY and upgrades unkeyed ones the next time the guest is seen", async () => {
    await ingest.ingestOrders(restaurantId, [order("h1", { guest: { displayName: "Lee", identities: [{ kind: "PHONE", value: "07700 900789" }] } })]);
    const before = await prisma.guestIdentity.findFirstOrThrow({ where: { restaurantId, kind: "PHONE" } });
    expect(before.valueHash).toMatch(/^sha256:/);

    vi.stubEnv("PII_HASH_KEY", "test-pii-key");
    await ingest.ingestOrders(restaurantId, [order("h2", { guest: { identities: [{ kind: "PHONE", value: "07700900789" }, { kind: "EMAIL", value: "lee@example.com" }] } })]);
    const guests = await prisma.guest.findMany({ where: { restaurantId, mergedIntoId: null }, include: { identities: true } });
    expect(guests).toHaveLength(1);
    expect(guests[0].id).toBe(before.guestId);
    expect(guests[0].identities.map((i) => i.valueHash.split(":")[0]).sort()).toEqual(["hmac", "hmac"]);
    const { piiHash } = await import("@/lib/hub/webhooks/minimise");
    expect(guests[0].identities.find((i) => i.kind === "PHONE")?.valueHash).toBe(piiHash("07700900789"));
  });

  it("merges guests that turn out to be the same person and recomputes their stats", async () => {
    await ingest.ingestOrders(restaurantId, [order("p1", { guest: { identities: [{ kind: "EMAIL", value: "sam@example.com" }] } })]);
    await ingest.ingestBookings(restaurantId, [
      {
        source: { kind: "API", provider: "RESDIARY", externalId: "bk-1" },
        startsAt: new Date("2026-10-17T19:00:00Z"),
        partySize: 2,
        status: "COMPLETED",
        guest: { displayName: "Sam", identities: [{ kind: "PHONE", value: "07700 900456" }] },
      },
    ]);
    expect(await prisma.guest.count({ where: { restaurantId, mergedIntoId: null } })).toBe(2);

    await ingest.ingestOrders(restaurantId, [
      order("p2", {
        placedAt: new Date("2026-10-17T21:00:00Z"),
        totalMinor: 4000,
        refundedMinor: 1000,
        status: "REFUNDED",
        guest: { identities: [{ kind: "EMAIL", value: "SAM@example.com" }, { kind: "PHONE", value: "07700900456" }] },
      }),
    ]);
    const live = await prisma.guest.findMany({ where: { restaurantId, mergedIntoId: null }, include: { identities: true, orders: true, bookings: true } });
    expect(live).toHaveLength(1);
    expect(live[0]).toMatchObject({ displayName: "Sam", visitCount: 2, totalSpendMinor: 5500, currency: "GBP" });
    expect([live[0].identities.length, live[0].orders.length, live[0].bookings.length]).toEqual([2, 2, 1]);
    expect(await prisma.guest.count({ where: { restaurantId, mergedIntoId: live[0].id } })).toBe(1);
  });

  it("keeps the linked guest when an update arrives without guest details", async () => {
    await ingest.ingestOrders(restaurantId, [order("k", { guest: { identities: [{ kind: "EMAIL", value: "kim@example.com" }] } })]);
    await ingest.ingestOrders(restaurantId, [order("k", { status: "REFUNDED", refundedMinor: 2500 })]);
    const o = await prisma.order.findFirstOrThrow({ where: { restaurantId, sourceExternalId: "k" }, include: { guest: true } });
    expect(o.guest).toMatchObject({ totalSpendMinor: 0 });
  });

  it("catalog links auto-match menu items by name and order lines link to them", async () => {
    const latte = await prisma.osMenuItem.create({ data: { restaurantId, name: "Latte" } });
    await ingest.upsertCatalog(restaurantId, "SQUARE", [
      { externalId: "cat-latte", name: "latte ", priceMinor: 380, currency: "gbp" },
      { externalId: "cat-cake", name: "Carrot cake" },
    ]);
    const links = await prisma.menuItemLink.findMany({ where: { restaurantId }, orderBy: { externalId: "asc" } });
    expect(links.map((l) => [l.externalId, l.menuItemId, l.currency])).toEqual([
      ["cat-cake", null, null],
      ["cat-latte", latte.id, "GBP"],
    ]);
    await ingest.ingestOrders(restaurantId, [order("l1", { lines: [{ name: "Latte", catalogExternalId: "cat-latte", quantity: 1, unitPriceMinor: 380 }] })]);
    const line = await prisma.orderLine.findFirstOrThrow({ where: { restaurantId }, include: { menuItemLink: true } });
    expect(line.menuItemLink?.menuItemId).toBe(latte.id);
  });
});
