/**
 * Deliverability-friendly outbound send via Resend.
 * Plain text + minimal HTML, reply-to, unsubscribe header.
 */

export type OutboundEmailPayload = {
  to: string;
  subject: string;
  body: string;
  /** Resend tags for A/B reporting, e.g. { name: "variant", value: "A" } */
  tags?: Array<{ name: string; value: string }>;
};

function replyToAddress(): string | undefined {
  const explicit = process.env.RESEND_REPLY_TO?.trim();
  if (explicit) return explicit;
  const from = process.env.RESEND_FROM_EMAIL?.trim() ?? "";
  const match = from.match(/<([^>]+)>/);
  return match?.[1]?.trim();
}

function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || "KOB <onboarding@resend.dev>";
}

function assertVerifiedFrom(from: string): void {
  if (from.includes("@resend.dev") && process.env.NODE_ENV === "production") {
    console.warn("[outbound] RESEND_FROM_EMAIL still uses resend.dev — verify your domain in Resend");
  }
}

function plainText(body: string): string {
  return body.replace(/\r\n/g, "\n").trim();
}

function htmlBody(body: string): string {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;line-height:1.55;color:#222;font-size:15px">${escaped
    .split("\n")
    .map((line) => `<p style="margin:0 0 12px">${line || "&nbsp;"}</p>`)
    .join("")}</div>`;
}

export async function sendOutboundEmailViaResend(
  apiKey: string,
  payload: OutboundEmailPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const from = fromAddress();
  assertVerifiedFrom(from);
  const replyTo = replyToAddress();

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const text = plainText(payload.body);

  const headers: Record<string, string> = {};
  if (replyTo) {
    headers["List-Unsubscribe"] = `<mailto:${replyTo}?subject=unsubscribe>`;
  }

  const { error } = await resend.emails.send({
    from,
    to: [payload.to.trim()],
    subject: payload.subject.trim() || "A note from KOB",
    text,
    html: htmlBody(text),
    ...(replyTo ? { replyTo } : {}),
    ...(Object.keys(headers).length ? { headers } : {}),
    ...(payload.tags?.length ? { tags: payload.tags } : {}),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
