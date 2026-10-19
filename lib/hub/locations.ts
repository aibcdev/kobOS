import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

/**
 * Which provider locations belong to this KOB restaurant. A merchant account can hold several venues; one KOB
 * restaurant is one venue, so orders are only synced for the locations the owner picked (stored on the Integration).
 */
export const MAX_LOCATIONS = 10;
export const PENDING_SETUP = "PENDING_SETUP";

export function locationIdsOf(metadata: Prisma.JsonValue | null | undefined): string[] | null {
  const ids = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? (metadata as Record<string, unknown>).locationIds : null;
  return Array.isArray(ids) && ids.length ? ids.filter((x): x is string => typeof x === "string").slice(0, MAX_LOCATIONS) : null;
}

export async function saveLocationChoice(integrationId: string, locationIds: string[]): Promise<void> {
  const row = await prisma.integration.findUniqueOrThrow({ where: { id: integrationId }, select: { metadata: true, status: true } });
  const metadata = { ...((row.metadata ?? {}) as Record<string, unknown>), locationIds: [...new Set(locationIds)].slice(0, MAX_LOCATIONS) };
  await prisma.integration.update({
    where: { id: integrationId },
    data: { metadata, ...(row.status === PENDING_SETUP ? { status: "CONNECTED" } : {}) },
  });
}

/** More than one location and nothing picked: stop syncing until the owner chooses. */
export async function requireLocationChoice(integrationId: string): Promise<void> {
  await prisma.integration.update({ where: { id: integrationId }, data: { status: PENDING_SETUP } });
}
