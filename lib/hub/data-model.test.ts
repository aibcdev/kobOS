import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { describeDb, seedRestaurant } from "@/tests/helpers/db";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});

describeDb("integration hub tables (T-81)", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let restaurantId: string;

  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
    restaurantId = (await seedRestaurant(prisma)).restaurant.id;
  });
  afterAll(async () => {
    await prisma.connectorEvent.deleteMany({ where: { restaurantId } });
    await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
    await prisma.$disconnect();
  });

  it("existing-style Integration rows get hub defaults", async () => {
    const i = await prisma.integration.create({ data: { restaurantId, provider: "SQUARE" } });
    expect(i).toMatchObject({ status: "CONNECTED", authKind: "OAUTH2_CODE", scopesGranted: [], externalAccountId: null });
    const epos = await prisma.integration.create({ data: { restaurantId, provider: "EPOS_NOW", authKind: "BASIC_KEY_SECRET" } });
    expect(epos.provider).toBe("EPOS_NOW");
  });

  it("SyncCursor is unique per stream and goes with its integration", async () => {
    const i = await prisma.integration.create({ data: { restaurantId, provider: "ZETTLE" } });
    await prisma.syncCursor.create({ data: { integrationId: i.id, stream: "orders" } });
    await expect(prisma.syncCursor.create({ data: { integrationId: i.id, stream: "orders" } })).rejects.toThrow();
    await prisma.integration.delete({ where: { id: i.id } });
    expect(await prisma.syncCursor.count({ where: { integrationId: i.id } })).toBe(0);
  });

  it("ConnectorEvent dedupes on (provider, externalId)", async () => {
    const data = { provider: "SQUARE", externalId: `evt-${restaurantId}`, type: "order.updated", payloadJson: {}, restaurantId };
    await prisma.connectorEvent.create({ data });
    await expect(prisma.connectorEvent.create({ data })).rejects.toMatchObject({ code: "P2002" });
  });

  it("ImportJob dedupes a file per restaurant by sha256", async () => {
    const data = { restaurantId, source: "DELIVEROO_CSV", origin: "UPLOAD", storagePath: "kob-imports/x.csv", fileSha256: "abc" };
    const job = await prisma.importJob.create({ data });
    expect(job).toMatchObject({ status: "PENDING", rowsTotal: 0, errorsJson: [] });
    await expect(prisma.importJob.create({ data })).rejects.toMatchObject({ code: "P2002" });
  });
});
