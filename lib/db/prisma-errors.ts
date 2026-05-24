import { Prisma } from "@prisma/client";

/** Transient / config DB reachability (not “row missing”). */
export function isPrismaDbUnreachableError(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    return e.code === "P1001" || e.code === "P1000" || e.code === "P1017";
  }
  if (e instanceof Prisma.PrismaClientInitializationError) return true;
  return false;
}
