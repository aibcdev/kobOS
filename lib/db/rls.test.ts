import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";

const TEST_DB = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DB)("row level security (set TEST_DATABASE_URL to a migrated database)", () => {
  const prisma = new PrismaClient({ datasourceUrl: TEST_DB });
  afterAll(() => prisma.$disconnect());

  it("is enabled on every public table", async () => {
    const open = await prisma.$queryRaw<{ relname: string }[]>`
      SELECT c.relname FROM pg_class c
      WHERE c.relnamespace = 'public'::regnamespace
        AND c.relkind IN ('r', 'p')
        AND c.relname <> '_prisma_migrations'
        AND NOT c.relrowsecurity
      ORDER BY 1`;
    expect(open.map((r) => r.relname)).toEqual([]);
  });
});
