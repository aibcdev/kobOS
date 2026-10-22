import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectorError } from "@/lib/connectors/errors";
import { describeDb, seedRestaurant } from "@/tests/helpers/db";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});

describe("health and backoff (pure)", () => {
  it("computeHealth", async () => {
    const { computeHealth } = await import("@/lib/hub/health");
    const now = new Date();
    const base = { cursors: [{ failureCount: 0 }], enabled: true, now };
    expect(computeHealth({ ...base, integration: { status: "CONNECTED" } })).toBe("CONNECTED");
    expect(computeHealth({ ...base, integration: { status: "REAUTH" } })).toBe("REAUTH");
    expect(computeHealth({ ...base, integration: { status: "PENDING_SETUP" } })).toBe("PENDING_SETUP");
    expect(computeHealth({ ...base, integration: { status: "CONNECTED" }, enabled: false })).toBe("PENDING_APPROVAL");
    expect(computeHealth({ ...base, integration: { status: "CONNECTED" }, cursors: [{ failureCount: 3 }] })).toBe("DEGRADED");
    expect(computeHealth({ ...base, integration: { status: "DEGRADED" } })).toBe("CONNECTED");
    expect(
      computeHealth({ ...base, integration: { status: "CONNECTED" }, expectedSilenceHours: 6, lastWebhookAt: new Date(now.getTime() - 7 * 3_600_000) }),
    ).toBe("DEGRADED");
  });

  it("failureBackoffMs grows and caps at 6h", async () => {
    const { failureBackoffMs } = await import("@/lib/hub/sync/scheduler");
    expect([1, 2, 3, 10].map(failureBackoffMs)).toEqual([300_000, 900_000, 2_700_000, 21_600_000]);
  });
});

describeDb("sync scheduler and runner on Postgres", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let hub: typeof import("@/lib/hub/connector");
  let scheduler: typeof import("@/lib/hub/sync/scheduler");
  let run: typeof import("@/lib/hub/sync/run");
  let health: typeof import("@/lib/hub/health");
  let restaurantId: string;
  let integrationId: string;

  // Fake Square "orders": cursors p1..p5, done on the 5th page; `failOnce` throws the first time a cursor is seen.
  const calls: (string | null)[] = [];
  const behaviour = { failOnce: null as string | null, rateLimitOnce: null as string | null, authError: false };
  const PAGES = ["p1", "p2", "p3", "p4", "p5"];

  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
    hub = await import("@/lib/hub/connector");
    scheduler = await import("@/lib/hub/sync/scheduler");
    run = await import("@/lib/hub/sync/run");
    health = await import("@/lib/hub/health");
    const { getManifest } = await import("@/lib/hub/manifest");
    hub.registerConnector({
      manifest: getManifest("SQUARE")!,
      validateCredentials: async () => ({ ok: true }),
      sync: async (_ctx, stream, cursor) => {
        if (stream !== "orders") return { rows: 1, nextCursor: null, done: true };
        calls.push(cursor);
        if (behaviour.authError) throw new ConnectorError("AUTH", "token revoked", 401);
        if (behaviour.rateLimitOnce !== null && behaviour.rateLimitOnce === cursor) {
          behaviour.rateLimitOnce = null;
          throw new ConnectorError("RATE_LIMIT", "slow down", 429, undefined, 2000);
        }
        if (behaviour.failOnce !== null && behaviour.failOnce === cursor) {
          behaviour.failOnce = null;
          throw new ConnectorError("PROVIDER", "boom", 500);
        }
        const i = cursor ? PAGES.indexOf(cursor) + 1 : 0;
        const next = PAGES[i];
        return { rows: 10, nextCursor: next === "p5" ? null : next, done: next === "p5" };
      },
    });
    restaurantId = (await seedRestaurant(prisma)).restaurant.id;
  });
  afterAll(async () => {
    hub.clearConnectors();
    await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    vi.stubEnv("SQUARE_LIVE", "1");
    calls.length = 0;
    Object.assign(behaviour, { failOnce: null, rateLimitOnce: null, authError: false });
    await prisma.integration.deleteMany({ where: { restaurantId } });
    integrationId = (await prisma.integration.create({ data: { restaurantId, provider: "SQUARE" } })).id;
  });

  const plainStep = () => {
    const sleeps: [string, number][] = [];
    const step: import("@/lib/hub/sync/run").HubStep = {
      run: (_id, fn) => fn(),
      sleep: async (id, ms) => {
        sleeps.push([id, ms]);
      },
    };
    return { step, sleeps };
  };
  const cursor = () => prisma.syncCursor.findUniqueOrThrow({ where: { integrationId_stream: { integrationId, stream: "orders" } } });

  it("ensureCursors creates one due cursor per manifest stream, idempotently", async () => {
    const now = new Date();
    expect((await scheduler.ensureCursors(integrationId, now)).map((s) => s.stream)).toEqual(["orders", "catalog", "customers"]);
    await scheduler.ensureCursors(integrationId, now);
    expect(await prisma.syncCursor.count({ where: { integrationId } })).toBe(3);
    const due = await scheduler.dueStreams(new Date(now.getTime() + 1000));
    expect(due.filter((d) => d.integrationId === integrationId).map((d) => d.stream).sort()).toEqual(["catalog", "customers", "orders"]);
  });

  it("dueStreams skips integrations whose flag is off or that need reauth", async () => {
    await scheduler.ensureCursors(integrationId);
    vi.stubEnv("SQUARE_LIVE", "");
    expect((await scheduler.dueStreams(new Date(Date.now() + 1000))).some((d) => d.integrationId === integrationId)).toBe(false);
    vi.stubEnv("SQUARE_LIVE", "1");
    await prisma.integration.update({ where: { id: integrationId }, data: { status: "REAUTH" } });
    expect((await scheduler.dueStreams(new Date(Date.now() + 1000))).some((d) => d.integrationId === integrationId)).toBe(false);
  });

  it("backfills 5 pages with a checkpoint per page; a crash on page 3 resumes at page 3", async () => {
    await scheduler.ensureCursors(integrationId);
    behaviour.failOnce = "p2";
    const { step } = plainStep();
    await expect(run.runStream(integrationId, "orders", step)).rejects.toThrow("boom");
    const afterCrash = await cursor();
    expect(afterCrash).toMatchObject({ cursor: "p2", backfillDone: false, failureCount: 1, lastError: "boom", rowsLastRun: 20 });
    expect(afterCrash.nextRunAt!.getTime()).toBeGreaterThan(Date.now() + 4 * 60_000);

    const second = plainStep();
    expect(await run.runStream(integrationId, "orders", second.step)).toEqual({ pages: 3, rows: 30, done: true });
    expect(calls).toEqual([null, "p1", "p2", "p2", "p3", "p4"]);
    const done = await cursor();
    expect(done).toMatchObject({ cursor: "p4", backfillDone: true, failureCount: 0, lastError: null });
    expect(done.nextRunAt!.getTime()).toBeGreaterThan(Date.now());
    expect((await prisma.integration.findUniqueOrThrow({ where: { id: integrationId } })).lastSuccessAt).not.toBeNull();
  });

  it("honours Retry-After and the manifest rps between pages", async () => {
    await scheduler.ensureCursors(integrationId);
    behaviour.rateLimitOnce = "p1";
    const { step, sleeps } = plainStep();
    expect((await run.runStream(integrationId, "orders", step)).done).toBe(true);
    expect(sleeps.filter(([id]) => id.startsWith("rate-limit"))).toEqual([["rate-limit-1-1", 2000]]);
    expect(sleeps.filter(([id]) => id.startsWith("gap")).every(([, ms]) => ms === 100)).toBe(true);
    expect(calls).toEqual([null, "p1", "p1", "p2", "p3", "p4"]);
  });

  it("an AUTH error marks the integration REAUTH", async () => {
    await scheduler.ensureCursors(integrationId);
    behaviour.authError = true;
    await expect(run.runStream(integrationId, "orders", plainStep().step)).rejects.toThrow("token revoked");
    expect(await prisma.integration.findUniqueOrThrow({ where: { id: integrationId } })).toMatchObject({ status: "REAUTH", lastErrorCode: "AUTH" });
  });

  it("refreshHealth: 3 failed runs → DEGRADED, recovery → CONNECTED, flag off → PENDING_APPROVAL", async () => {
    await scheduler.ensureCursors(integrationId);
    await prisma.syncCursor.update({ where: { integrationId_stream: { integrationId, stream: "orders" } }, data: { failureCount: 3 } });
    expect(await health.refreshHealth(integrationId)).toBe("DEGRADED");
    await prisma.syncCursor.update({ where: { integrationId_stream: { integrationId, stream: "orders" } }, data: { failureCount: 0 } });
    expect(await health.refreshHealth(integrationId)).toBe("CONNECTED");
    vi.stubEnv("SQUARE_LIVE", "");
    expect(await health.refreshHealth(integrationId)).toBe("PENDING_APPROVAL");
    expect((await prisma.integration.findUniqueOrThrow({ where: { id: integrationId } })).lastHealthAt).not.toBeNull();
  });
});
