import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { describeDb, seedRestaurant } from "@/tests/helpers/db";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});
vi.mock("@/inngest/client", () => ({ inngest: { send: async () => undefined } }));

describeDb("disconnect data choice and retention sweep (review H-9)", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let restaurantId: string;
  const day = new Date("2026-10-14T12:00:00Z");

  beforeAll(async () => {
    vi.stubEnv("INTEGRATION_ENC_KEY", Buffer.alloc(32, 9).toString("base64"));
    prisma = (await import("@/lib/db/prisma")).prisma;
    restaurantId = (await seedRestaurant(prisma)).restaurant.id;
  });
  afterAll(async () => {
    await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
  });
  beforeEach(async () => {
    await prisma.order.deleteMany({ where: { restaurantId } });
    await prisma.guest.deleteMany({ where: { restaurantId } });
    await prisma.salesSnapshot.deleteMany({ where: { restaurantId } });
    await prisma.integration.deleteMany({ where: { restaurantId } });
    const { ingestOrders, ingestGuests } = await import("@/lib/commerce/ingest");
    await prisma.integration.create({ data: { restaurantId, provider: "SQUARE", status: "CONNECTED" } });
    await ingestOrders(restaurantId, [
      {
        source: { kind: "API", provider: "SQUARE", externalId: "sq-1" },
        status: "COMPLETED",
        placedAt: day,
        currency: "GBP",
        totalMinor: 2500,
        guest: { displayName: "Ada Lovelace", identities: [{ kind: "EMAIL", value: "ada@example.com", provider: "SQUARE" }] },
      },
    ]);
    // Grace also bought through an import, so her name has another source.
    await ingestGuests(restaurantId, [{ displayName: "Grace Hopper", identities: [{ kind: "PHONE", value: "+447700900001", provider: "SQUARE" }] }]);
    await ingestGuests(restaurantId, [{ displayName: "Grace Hopper", identities: [{ kind: "PHONE", value: "+447700900001", provider: "SQUARE" }, { kind: "EMAIL", value: "grace@example.com", provider: "GUESTS_CSV" }] }]);
  });

  it("keeps sales and removes the provider's guest details only after 30 days", async () => {
    const { disconnectIntegration } = await import("@/lib/hub/connections");
    const { retentionSweep } = await import("@/lib/hub/retention");
    const now = new Date("2026-10-19T09:00:00Z");
    expect(await disconnectIntegration(restaurantId, "SQUARE", "KEEP_TOTALS", now)).toBe(true);

    expect(await retentionSweep(new Date(now.getTime() + 29 * 86_400_000))).toEqual({ purged: 0 });
    expect(await prisma.guestIdentity.count({ where: { restaurantId, provider: "SQUARE" } })).toBe(2);

    expect(await retentionSweep(new Date(now.getTime() + 31 * 86_400_000))).toEqual({ purged: 1 });
    expect(await prisma.guestIdentity.count({ where: { restaurantId, provider: "SQUARE" } })).toBe(0);
    const guests = await prisma.guest.findMany({ where: { restaurantId }, include: { identities: true }, orderBy: { createdAt: "asc" } });
    expect(guests.map((g) => [g.displayName, g.identities.map((i) => i.provider)])).toEqual([
      [null, []],
      ["Grace Hopper", ["GUESTS_CSV"]],
    ]);
    expect(await prisma.order.count({ where: { restaurantId } })).toBe(1);
    expect(await retentionSweep(new Date(now.getTime() + 32 * 86_400_000))).toEqual({ purged: 0 });
  });

  it("deletes everything the provider brought in on request, including its sales days", async () => {
    const { rebuildSalesSnapshots } = await import("@/lib/commerce/sales-snapshot");
    await rebuildSalesSnapshots(restaurantId, day, day);
    expect(await prisma.salesSnapshot.count({ where: { restaurantId, source: "SQUARE" } })).toBe(1);

    const { disconnectIntegration } = await import("@/lib/hub/connections");
    await disconnectIntegration(restaurantId, "SQUARE", "DELETE_ALL");
    expect(await prisma.order.count({ where: { restaurantId } })).toBe(0);
    expect(await prisma.salesSnapshot.count({ where: { restaurantId, source: "SQUARE" } })).toBe(0);
    const guests = await prisma.guest.findMany({ where: { restaurantId }, include: { identities: true } });
    expect(guests.map((g) => [g.displayName, g.identities.map((i) => i.provider)])).toEqual([["Grace Hopper", ["GUESTS_CSV"]]]);
    const row = await prisma.integration.findFirstOrThrow({ where: { restaurantId, provider: "SQUARE" } });
    expect(row.metadata).toMatchObject({ retention: { mode: "DELETE_ALL", purgeAfter: null } });
  });
});
