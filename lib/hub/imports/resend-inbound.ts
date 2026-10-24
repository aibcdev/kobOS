import type { InboundAttachment } from "@/lib/hub/imports/inbound";
import { MAX_IMPORT_BYTES } from "@/lib/hub/imports/pipeline";

const MAX_ATTACHMENTS = 10;

type ReceivedAttachment = { id: string; filename?: string; content_type?: string; size?: number; download_url?: string };

/**
 * Resend Receiving: the `email.received` webhook carries metadata only; attachments are listed by email id and each
 * has a short-lived signed download URL.
 */
export async function fetchReceivedAttachments(emailId: string, deps: { fetch?: typeof fetch } = {}): Promise<InboundAttachment[]> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error("RESEND_API_KEY is not set");
  const f = deps.fetch ?? fetch;
  const res = await f(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}/attachments`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Resend attachments list returned ${res.status}`);
  const { data = [] } = (await res.json()) as { data?: ReceivedAttachment[] };

  const out: InboundAttachment[] = [];
  for (const a of data.slice(0, MAX_ATTACHMENTS)) {
    if (!a.download_url || !a.filename || (a.size ?? 0) > MAX_IMPORT_BYTES) continue;
    const file = await f(a.download_url, { signal: AbortSignal.timeout(30_000) });
    if (!file.ok) throw new Error(`Attachment download returned ${file.status}`);
    out.push({ filename: a.filename, contentType: a.content_type, content: Buffer.from(await file.arrayBuffer()) });
  }
  return out;
}
