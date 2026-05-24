import type { Integration } from "@prisma/client";

/** Never expose ciphertext to clients. */
export function integrationPublic(i: Integration) {
  const { encryptedAccessToken, encryptedRefreshToken, ...rest } = i;
  return {
    ...rest,
    hasAccessToken: Boolean(encryptedAccessToken),
    hasRefreshToken: Boolean(encryptedRefreshToken),
  };
}
