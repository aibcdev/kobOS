import { createHmac, timingSafeEqual } from "node:crypto";
import { createImport, ImportError } from "@/lib/hub/imports/pipeline";

/**
 * Owners (or their delivery apps / booking systems) email files to
 *   data+<restaurantId>.<token>@<INBOUND_EMAIL_DOMAIN>       → detected from the file
 *   bookings+<restaurantId>.<token>@…                         → bookings export
 *   invoices+<restaurantId>.<token>@…                         → supplier invoices (PDF stored)
 * The token is an HMAC of the restaurant id, so the address is unguessable without a lookup table.
 */
export const INBOUND_KINDS = { data: null, bookings: "BOOKINGS_CSV", invoices: "INVOICE_PDF" } as const;
export type InboundKind = keyof typeof INBOUND_KINDS;

function secret(): string {
  const s = process.env.IMPORT_INBOUND_SECRET?.trim();
  if (!s) throw new Error("IMPORT_INBOUND_SECRET is not set");
  return s;
}

export function inboundDomain(): string {
  return process.env.INBOUND_EMAIL_DOMAIN?.trim() || "in.trykob.com";
}

function token(restaurantId: string): string {
  return createHmac("sha256", secret()).update(`kob-imports:${restaurantId}`).digest("base64url").replace(/[-_]/g, "").slice(0, 12).toLowerCase();
}

export function inboundAddress(restaurantId: string, kind: InboundKind = "data"): string {
  return `${kind}+${restaurantId}.${token(restaurantId)}@${inboundDomain()}`;
}

/** Null for anything that isn't one of our addresses with a valid token. */
export function parseInboundAddress(address: string): { kind: InboundKind; restaurantId: string } | null {
  const m = address
    .trim()
    .toLowerCase()
    .match(/<?([a-z]+)\+([a-z0-9]+)\.([a-z0-9]+)@([^>\s]+)>?$/);
  if (!m || !(m[1] in INBOUND_KINDS) || m[4] !== inboundDomain().toLowerCase()) return null;
  const [, kind, restaurantId, given] = m;
  const expected = token(restaurantId);
  if (given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) return null;
  return { kind: kind as InboundKind, restaurantId };
}

export type InboundAttachment = { filename: string; contentType?: string; content: Buffer };

export type InboundResult = { restaurantId: string; jobIds: string[]; duplicates: number; rejected: { filename: string; reason: string }[] };

/** Creates one import per usable attachment for every KOB address the email was sent to. */
export async function handleInboundEmail(email: { to: string[]; attachments: InboundAttachment[] }): Promise<InboundResult[]> {
  const out: InboundResult[] = [];
  const seen = new Set<string>();
  for (const to of email.to) {
    const target = parseInboundAddress(to);
    if (!target || seen.has(`${target.restaurantId}:${target.kind}`)) continue;
    seen.add(`${target.restaurantId}:${target.kind}`);
    const result: InboundResult = { restaurantId: target.restaurantId, jobIds: [], duplicates: 0, rejected: [] };
    for (const a of email.attachments) {
      try {
        const hint = INBOUND_KINDS[target.kind];
        const { job, duplicate } = await createImport({
          restaurantId: target.restaurantId,
          filename: a.filename,
          contentType: a.contentType,
          body: a.content,
          origin: "EMAIL",
          // invoices+ only forces PDFs; a CSV sent there is still detected from its content.
          hint: hint === "INVOICE_PDF" && !/\.pdf$/i.test(a.filename) ? null : hint,
        });
        // A retried delivery finds its own earlier, never-run job: queue it again rather than calling it a duplicate.
        if (!duplicate || job.status === "PENDING") result.jobIds.push(job.id);
        else result.duplicates += 1;
      } catch (e) {
        if (!(e instanceof ImportError)) throw e;
        result.rejected.push({ filename: a.filename, reason: e.message });
      }
    }
    out.push(result);
  }
  return out;
}
