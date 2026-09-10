import { OutboundLeadStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { normalizeOutboundEmail } from "@/lib/outbound/outbound-send-dedupe";
import { sendOutboundEmailViaResend } from "@/lib/outbound/send-resend-outbound-email";
import { isOutboundSuppressed } from "@/lib/outbound/suppression";

export async function sendApprovedOutboundLead(
  leadId: string,
  apiKey: string,
): Promise<{ sent: boolean; providerMessageId?: string; reason?: string }> {
  const lead = await prisma.outboundLead.findUnique({ where: { id: leadId } });
  if (!lead) return { sent: false, reason: "not_found" };
  if (lead.status === OutboundLeadStatus.SENT && lead.resendEmailId) {
    return { sent: false, reason: "already_sent", providerMessageId: lead.resendEmailId };
  }
  if (lead.status !== OutboundLeadStatus.APPROVED) {
    return { sent: false, reason: "not_approved" };
  }

  const email = normalizeOutboundEmail(lead.contactEmail);
  if (!email || !lead.messageBody?.includes("/audit/")) {
    return { sent: false, reason: "invalid_payload" };
  }
  if (await isOutboundSuppressed(email)) {
    return { sent: false, reason: "suppressed" };
  }

  const idempotencyKey = `outbound-lead-${lead.id}`;
  const existing = await prisma.outboundDelivery.findUnique({
    where: { outboundLeadId: lead.id },
  });
  if (existing?.status === "SENT" && existing.providerMessageId) {
    return { sent: false, reason: "already_sent", providerMessageId: existing.providerMessageId };
  }
  const delivery = await prisma.outboundDelivery.upsert({
    where: { outboundLeadId: lead.id },
    create: { outboundLeadId: lead.id, idempotencyKey, status: "SENDING", attemptCount: 1 },
    update: { status: "SENDING", attemptCount: { increment: 1 }, lastError: null },
  });
  const result = await sendOutboundEmailViaResend(apiKey, {
    to: email,
    subject: lead.messageSubject?.trim() || "A note from KOB",
    body: lead.messageBody,
    idempotencyKey,
    tags: lead.emailVariant
      ? [
          { name: "variant", value: lead.emailVariant },
          { name: "outbound", value: "1" },
          { name: "lead_id", value: lead.id.slice(0, 64) },
        ]
      : [
          { name: "outbound", value: "1" },
          { name: "lead_id", value: lead.id.slice(0, 64) },
        ],
  });

  if (!result.ok) {
    await prisma.outboundDelivery.update({
      where: { id: delivery.id },
      data: { status: "FAILED", lastError: result.error.slice(0, 1000) },
    });
    throw new Error(result.error);
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.outboundDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "SENT",
        providerMessageId: result.id,
        sentAt: now,
        lastError: null,
      },
    }),
    prisma.outboundLead.update({
      where: { id: lead.id },
      data: {
        status: OutboundLeadStatus.SENT,
        sentAt: now,
        resendEmailId: result.id,
        insightSummary: `SENT ${now.toISOString()} resend:${result.id ?? "ok"}`.slice(0, 500),
      },
    }),
  ]);

  return { sent: true, providerMessageId: result.id };
}
