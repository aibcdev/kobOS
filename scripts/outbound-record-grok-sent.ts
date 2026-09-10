import { readFile } from "node:fs/promises";
import { OutboundLeadStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type Receipt = { email: string; messageId: string; sentAt?: string };

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Usage: npm run outbound:record-grok -- /path/to/receipts.json");
  const receipts = JSON.parse(await readFile(file, "utf8")) as Receipt[];
  if (!Array.isArray(receipts) || receipts.length === 0) throw new Error("Receipt file is empty");

  let recorded = 0;
  for (const receipt of receipts) {
    const email = receipt.email.trim().toLowerCase();
    const lead = await prisma.outboundLead.findFirst({
      where: { contactEmail: { equals: email, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
    });
    if (!lead || !receipt.messageId.trim()) continue;
    const sentAt = receipt.sentAt ? new Date(receipt.sentAt) : new Date();
    await prisma.$transaction([
      prisma.outboundDelivery.upsert({
        where: { providerMessageId: receipt.messageId.trim() },
        create: {
          outboundLeadId: lead.id,
          providerMessageId: receipt.messageId.trim(),
          idempotencyKey: `grok-gmail-${receipt.messageId.trim()}`,
          status: "SENT",
          attemptCount: 1,
          sentAt,
        },
        update: { status: "SENT", sentAt },
      }),
      prisma.outboundLead.update({
        where: { id: lead.id },
        data: { status: OutboundLeadStatus.SENT, sentAt },
      }),
    ]);
    recorded += 1;
  }
  console.log(JSON.stringify({ received: receipts.length, recorded }));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
