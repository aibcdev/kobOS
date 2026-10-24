/**
 * How product emails to owners leave KOB. Resend when RESEND_API_KEY is set; otherwise a dry run that records the
 * email as DRY_RUN (so nothing claims it was sent). Tests swap in a capturing transport.
 */

export type OutgoingEmail = { to: string; subject: string; html: string; text: string; idempotencyKey: string };
export type SendResult = { status: "SENT" | "DRY_RUN"; providerId?: string };
export type Transport = (msg: OutgoingEmail) => Promise<SendResult>;

/**
 * Product mail (brief, approvals, trial) comes from its own sender, apart from cold outbound on hello@trykob.com.
 * Akeem sets the domain in Resend; until then it falls back to the sign-in sender.
 */
export function productFrom(): string {
  return (
    process.env.RESEND_PRODUCT_FROM_EMAIL?.trim() ||
    process.env.RESEND_AUTH_FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "KOB <hello@trykob.com>"
  );
}

export const resendTransport: Transport = async (msg) => {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return { status: "DRY_RUN" };
  const { Resend } = await import("resend");
  const { idempotencyKey, ...email } = msg;
  const replyTo = process.env.RESEND_REPLY_TO?.trim();
  const { data, error } = await new Resend(key).emails.send({ from: productFrom(), ...email, ...(replyTo ? { replyTo } : {}) }, { idempotencyKey });
  if (error) throw new Error(`Resend: ${error.message}`);
  return { status: "SENT", providerId: data?.id };
};

let override: Transport | null = null;

/** Tests: capture instead of sending. Pass null to restore. */
export function useTransport(t: Transport | null): void {
  override = t;
}

export function transport(): Transport {
  return override ?? resendTransport;
}

/** A transport that keeps every email in memory, for tests and the 30-day simulation. */
export function captureTransport(): { transport: Transport; sent: OutgoingEmail[] } {
  const sent: OutgoingEmail[] = [];
  return {
    sent,
    transport: async (msg) => {
      sent.push(msg);
      return { status: "SENT", providerId: `test_${sent.length}` };
    },
  };
}
