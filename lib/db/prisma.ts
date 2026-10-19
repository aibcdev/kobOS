import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/** Keep pool small on Supabase session pooler — avoids P2024 during long seed runs. */
function pooledDatabaseUrl(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return raw;
  if (/connection_limit=/i.test(raw)) return raw;
  const sep = raw.includes("?") ? "&" : "?";
  return `${raw}${sep}connection_limit=5&pool_timeout=30&connect_timeout=30`;
}

const databaseUrl = pooledDatabaseUrl(process.env.DATABASE_URL);

/** Without a URL, Prisma fails on first query instead of at import (tests import routes freely). */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
