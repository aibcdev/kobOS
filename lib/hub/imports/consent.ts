import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { consentSummaryOf, filenameOf } from "@/lib/hub/imports/pipeline";
import { ATTESTATION_VERSION, attestationText, CHANNEL_LABEL } from "@/lib/hub/imports/consent-text";
import { CONSENT_FIELDS, type ConsentChannel, type ConsentField } from "@/lib/hub/imports/sources";

/**
 * Owner attestation for imported marketing consent. Nothing imported becomes GRANTED until an OWNER ticks the
 * statement for one column and one channel; the wording, its version, who and when go into each row's evidence.
 */

export type AttestResult = { ok: true; granted: number } | { ok: false; status: number; error: string };

export async function attestImportConsent(input: { jobId: string; userId: string; field: string; channel: string }): Promise<AttestResult> {
  const job = await prisma.importJob.findUniqueOrThrow({ where: { id: input.jobId } });
  const member = await prisma.teamMember.findUnique({ where: { userId_restaurantId: { userId: input.userId, restaurantId: job.restaurantId } }, select: { role: true } });
  if (member?.role !== "OWNER") return { ok: false, status: 403, error: "Only the owner can confirm marketing consent." };
  if (!(input.field in CONSENT_FIELDS)) return { ok: false, status: 422, error: "Unknown consent column." };
  const field = input.field as ConsentField;
  if (!["EMAIL", "SMS", "WHATSAPP"].includes(input.channel)) return { ok: false, status: 422, error: "Pick email, text message or WhatsApp." };
  const channel = input.channel as ConsentChannel;
  const stated = CONSENT_FIELDS[field];
  if (stated && stated !== channel) return { ok: false, status: 422, error: `That column is ${CHANNEL_LABEL[stated]} consent; it can't be used for ${CHANNEL_LABEL[channel]}.` };

  const summary = consentSummaryOf(job);
  const entry = summary[field];
  if (!entry || entry.attested) return { ok: false, status: 409, error: "Nothing waiting for confirmation in that column." };

  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { id: job.restaurantId }, select: { name: true } });
  const at = new Date();
  const evidence = {
    attestedByUserId: input.userId,
    attestedAt: at.toISOString(),
    textVersion: ATTESTATION_VERSION,
    text: attestationText({ restaurantName: restaurant.name, channel, filename: filenameOf(job), column: entry.column }),
  };
  const granted = await prisma.$executeRaw`
    UPDATE "public"."GuestConsent"
    SET "status" = 'GRANTED', "channel" = ${channel}, "evidenceJson" = "evidenceJson" || ${JSON.stringify(evidence)}::jsonb
    WHERE "sourceImportJobId" = ${job.id} AND "status" = 'UNKNOWN' AND "evidenceJson"->>'field' = ${field}`;

  const meta = (job.mappingJson ?? {}) as Record<string, unknown>;
  await prisma.importJob.update({
    where: { id: job.id },
    data: { mappingJson: { ...meta, consent: { ...summary, [field]: { ...entry, attested: { channel, at: evidence.attestedAt } } } } as Prisma.InputJsonValue },
  });
  return { ok: true, granted };
}
