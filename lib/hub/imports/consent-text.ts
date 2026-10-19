import type { ConsentChannel } from "@/lib/hub/imports/sources";

/** The statement the owner ticks. Changing the wording means bumping ATTESTATION_VERSION; stored evidence keeps both. */
export const ATTESTATION_VERSION = "2026-10-19";
export const CHANNEL_LABEL: Record<ConsentChannel, string> = { EMAIL: "email", SMS: "text message", WHATSAPP: "WhatsApp" };

export function attestationText(input: { restaurantName: string; channel: ConsentChannel; filename: string; column: string }): string {
  return `These guests agreed to receive marketing from ${input.restaurantName} by ${CHANNEL_LABEL[input.channel]}. I have their consent on record. Source: "${input.column}" column in ${input.filename}.`;
}
