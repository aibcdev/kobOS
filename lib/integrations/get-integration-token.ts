import type { Integration, IntegrationProvider } from "@prisma/client";
import { decryptSecret } from "@/lib/crypto/tokens";
import { prisma } from "@/lib/db/prisma";

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
  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  try {
    if (row.encryptedAccessToken) accessToken = decryptSecret(row.encryptedAccessToken);
    if (row.encryptedRefreshToken) refreshToken = decryptSecret(row.encryptedRefreshToken);
  } catch {
    return { accessToken: null, refreshToken: null };
  }
  return { accessToken, refreshToken };
}

export async function getIntegrationTokens(
  restaurantId: string,
  provider: IntegrationProvider,
): Promise<{ accessToken: string | null; refreshToken: string | null; metadata: Record<string, unknown> } | null> {
  const row = await getIntegration(restaurantId, provider);
  if (!row) return null;
  const tokens = decryptIntegrationToken(row);
  return {
    ...tokens,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}
