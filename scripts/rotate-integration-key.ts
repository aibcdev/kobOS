/**
 * Re-encrypt Integration tokens under the current INTEGRATION_ENC_KEY.
 *
 * Rotation:
 *   1. Set INTEGRATION_ENC_KEY_PREVIOUS = old key, INTEGRATION_ENC_KEY = new key (`openssl rand -base64 32`). Deploy.
 *   2. npx dotenv -e .env.local -- npx tsx scripts/rotate-integration-key.ts          (dry run: counts only)
 *   3. npx dotenv -e .env.local -- npx tsx scripts/rotate-integration-key.ts --apply
 *   4. When a dry run reports 0 to re-encrypt, remove INTEGRATION_ENC_KEY_PREVIOUS.
 * Never prints token values.
 */
import { PrismaClient } from "@prisma/client";
import { decryptSecretDetailed, encryptSecret } from "../lib/crypto/tokens";

const apply = process.argv.includes("--apply");
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.integration.findMany({
    where: { OR: [{ encryptedAccessToken: { not: null } }, { encryptedRefreshToken: { not: null } }] },
    select: { id: true, provider: true, encryptedAccessToken: true, encryptedRefreshToken: true },
  });

  let stale = 0;
  let failed = 0;
  for (const row of rows) {
    const data: { encryptedAccessToken?: string; encryptedRefreshToken?: string } = {};
    try {
      for (const field of ["encryptedAccessToken", "encryptedRefreshToken"] as const) {
        const value = row[field];
        if (!value) continue;
        const { plaintext, needsReencrypt } = decryptSecretDetailed(value);
        if (needsReencrypt) data[field] = encryptSecret(plaintext);
      }
    } catch {
      failed += 1;
      console.error(`[rotate] ${row.provider} ${row.id}: cannot decrypt with current or previous key`);
      continue;
    }
    if (!Object.keys(data).length) continue;
    stale += 1;
    if (apply) await prisma.integration.update({ where: { id: row.id }, data });
  }

  console.log(
    `[rotate] ${rows.length} integrations with tokens · ${stale} ${apply ? "re-encrypted" : "to re-encrypt"} · ${failed} undecryptable`,
  );
  if (!apply && stale) console.log("[rotate] dry run — pass --apply to write");
}

main()
  .catch((err) => {
    console.error("[rotate] failed", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
