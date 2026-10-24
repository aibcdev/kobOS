import type { Integration, IntegrationProvider } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { TokenError } from "@/lib/hub/auth/oauth2";
import { decryptTokens, getAccessToken } from "@/lib/hub/tokens";

/** Thin compatibility layer over lib/hub/tokens.ts, which owns decrypting and refreshing. */

export async function getIntegration(
  restaurantId: string,
  provider: IntegrationProvider,
): Promise<Integration | null> {
  return prisma.integration.findUnique({
    where: { restaurantId_provider: { restaurantId, provider } },
  });
}

export function decryptIntegrationToken(row: Integration): {
  accessToken: string | null;
  refreshToken: string | null;
} {
  return decryptTokens(row);
}

/**
 * A usable access token for this integration, refreshed through the hub when it is about to expire. Null when the
 * owner must reconnect or the provider can't be reached; callers treat that as "no data this run".
 */
export async function getIntegrationAccessToken(row: Integration): Promise<string | null> {
  try {
    return await getAccessToken(row.id);
  } catch (e) {
    if (e instanceof TokenError && e.code === "not_configured") return decryptTokens(row).accessToken;
    return null;
  }
}

export async function getIntegrationTokens(
  restaurantId: string,
  provider: IntegrationProvider,
): Promise<{ accessToken: string | null; refreshToken: string | null; metadata: Record<string, unknown> } | null> {
  const row = await getIntegration(restaurantId, provider);
  if (!row) return null;
  return {
    accessToken: await getIntegrationAccessToken(row),
    refreshToken: decryptTokens(row).refreshToken,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}
