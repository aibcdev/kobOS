import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const TEST_DB = process.env.TEST_DATABASE_URL;

async function waitOutWindowEdge(windowSec: number) {
  const msIntoWindow = Date.now() % (windowSec * 1000);
  if (windowSec * 1000 - msIntoWindow < 2_000) await new Promise((r) => setTimeout(r, 2_100));
}

describe("limit() when the database is down", () => {
  it("falls back to an in-memory window: 10 pass, the 11th is refused", async () => {
    vi.resetModules();
    vi.doMock("@/lib/db/prisma", () => ({
      prisma: {
        $queryRaw: () => Promise.reject(new Error("db down")),
        $executeRaw: () => Promise.reject(new Error("db down")),
      },
    }));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { limit } = await import("@/lib/security/rate-limit");
    await waitOutWindowEdge(60);
    const key = `talk:fallback-${crypto.randomUUID()}`;
    for (let i = 0; i < 10; i++) expect((await limit(key, { windowSec: 60, max: 10 })).ok).toBe(true);
    const eleventh = await limit(key, { windowSec: 60, max: 10 });
    expect(eleventh.ok).toBe(false);
    expect(eleventh.remaining).toBe(0);
    expect(eleventh.retryAfterSec).toBeGreaterThan(0);
    vi.doUnmock("@/lib/db/prisma");
  });
});

describe.skipIf(!TEST_DB)("limit() on Postgres (set TEST_DATABASE_URL)", () => {
  beforeAll(() => {
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", TEST_DB!);
  });
  afterAll(async () => {
    const { prisma } = await import("@/lib/db/prisma");
    await prisma.$disconnect();
    vi.unstubAllEnvs();
  });

  it("the 11th talk message in 60s is refused across two module instances", async () => {
    await waitOutWindowEdge(60);
    const key = `talk:${crypto.randomUUID()}`;

    const first = await import("@/lib/security/rate-limit");
    for (let i = 0; i < 10; i++) expect((await first.limit(key, { windowSec: 60, max: 10 })).ok).toBe(true);

    vi.resetModules();
    const second = await import("@/lib/security/rate-limit");
    expect(second).not.toBe(first);
    expect((await second.limit(key, { windowSec: 60, max: 10 })).ok).toBe(false);
  });

  it("counts atomically under concurrency", async () => {
    await waitOutWindowEdge(60);
    const { limit } = await import("@/lib/security/rate-limit");
    const key = `burst:${crypto.randomUUID()}`;
    const results = await Promise.all(Array.from({ length: 25 }, () => limit(key, { windowSec: 60, max: 20 })));
    expect(results.filter((r) => r.ok)).toHaveLength(20);
  });
});
