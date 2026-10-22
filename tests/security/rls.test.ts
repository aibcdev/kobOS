import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { describeDb, seedRestaurant } from "@/tests/helpers/db";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});

/** docs/adr/0002-rls-deny-all.md: RLS on everywhere, no policies, so only the owner role (Prisma) sees rows. */
describeDb("row-level security is deny-all", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let restaurantId = "";
  const ROLE = "kob_anon_probe";

  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
    restaurantId = (await seedRestaurant(prisma)).restaurant.id;
    // Stands in for Supabase's anon/authenticated roles: may SELECT any table, owns none.
    await prisma.$executeRawUnsafe(`DO $$ BEGIN CREATE ROLE ${ROLE} NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO ${ROLE}`);
    await prisma.$executeRawUnsafe(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${ROLE}`);
  });
  afterAll(async () => {
    await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
  });

  it("every public table has RLS on", async () => {
    const off = await prisma.$queryRawUnsafe<{ relname: string }[]>(`
      SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND c.relname <> '_prisma_migrations' AND NOT c.relrowsecurity`);
    expect(off.map((r) => r.relname)).toEqual([]);
  });

  it("a non-owner role reads no rows, even with SELECT granted", async () => {
    const [owner, anon] = await prisma.$transaction(async (tx) => {
      const asOwner = await tx.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*)::bigint AS n FROM "Restaurant" WHERE id = $1`, restaurantId);
      await tx.$executeRawUnsafe(`SET LOCAL ROLE ${ROLE}`);
      const asAnon = await tx.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*)::bigint AS n FROM "Restaurant" WHERE id = $1`, restaurantId);
      return [Number(asOwner[0].n), Number(asAnon[0].n)];
    });
    expect(owner).toBe(1);
    expect(anon).toBe(0);
  });
});
