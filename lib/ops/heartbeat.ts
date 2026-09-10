import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export async function markOpsHeartbeat(key: string, detail: Prisma.InputJsonValue = {}): Promise<void> {
  await prisma.opsHeartbeat.upsert({
    where: { key },
    create: { key, lastSuccessAt: new Date(), detail },
    update: { lastSuccessAt: new Date(), detail },
  });
}
