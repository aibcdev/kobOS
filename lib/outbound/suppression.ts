import { prisma } from "@/lib/db/prisma";
import { normalizeOutboundEmail } from "@/lib/outbound/outbound-send-dedupe";

export async function isOutboundSuppressed(email: string): Promise<boolean> {
  const normalizedEmail = normalizeOutboundEmail(email);
  if (!normalizedEmail) return true;
  return Boolean(
    await prisma.outboundSuppression.findUnique({
      where: { normalizedEmail },
      select: { id: true },
    }),
  );
}

export async function suppressOutboundEmail(input: {
  email: string;
  reason: "unsubscribe" | "bounce" | "complaint" | "manual";
  source: string;
  providerMessageId?: string | null;
}): Promise<void> {
  const normalizedEmail = normalizeOutboundEmail(input.email);
  if (!normalizedEmail) return;
  await prisma.outboundSuppression.upsert({
    where: { normalizedEmail },
    create: {
      normalizedEmail,
      reason: input.reason,
      source: input.source,
      providerMessageId: input.providerMessageId,
    },
    update: {
      reason: input.reason,
      source: input.source,
      providerMessageId: input.providerMessageId,
    },
  });
}
