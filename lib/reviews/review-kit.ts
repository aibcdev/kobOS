import QRCode from "qrcode";
import { lastSnapshot } from "@/lib/connectors/gbp/listing";
import { prisma } from "@/lib/db/prisma";

/**
 * Getting more reviews from happy guests: the venue's Google review link, a QR code, a printable table card and a
 * short thank-you message. KOB never invents guests and never buys or gates reviews.
 */

export function reviewLinkForPlace(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

function placeIdFromAudit(payload: unknown): string | null {
  const p = (payload ?? {}) as { geoLocation?: { placeId?: string }; googlePlace?: { placeId?: string } };
  return p.geoLocation?.placeId ?? p.googlePlace?.placeId ?? null;
}

/** Google's own link from the connected listing, else one built from the place id the audit found. */
export async function googleReviewLink(restaurantId: string): Promise<{ url: string; source: "listing" | "audit" } | null> {
  const snap = await lastSnapshot(restaurantId);
  if (snap?.reviewUri) return { url: snap.reviewUri, source: "listing" };
  if (snap?.placeId) return { url: reviewLinkForPlace(snap.placeId), source: "listing" };
  const audits = await prisma.visibilityAudit.findMany({
    where: { restaurantId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { resultPayload: true },
  });
  for (const a of audits) {
    const id = placeIdFromAudit(a.resultPayload);
    if (id) return { url: reviewLinkForPlace(id), source: "audit" };
  }
  return null;
}

export async function reviewQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: "#2b2420", light: "#ffffff" } });
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** A printable A6 table card: two per A5 sheet, fold or stand in a holder. */
export async function tableCardHtml(restaurantName: string, url: string): Promise<string> {
  const qr = await reviewQrSvg(url);
  const card = `<section class="card"><p class="kicker">${esc(restaurantName)}</p><h1>Enjoyed your visit?</h1><p class="lede">We'd love to hear about it on Google. It takes a minute and helps other guests find us.</p><div class="qr">${qr}</div><p class="hint">Scan with your phone camera</p></section>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(restaurantName)} — review card</title><style>
@page{size:A5;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Georgia,"Times New Roman",serif;color:#2b2420;background:#fff}
.sheet{display:grid;grid-template-rows:1fr 1fr;height:210mm;width:148mm;margin:auto}
.card{border:1px dashed #c9bfb3;padding:10mm 12mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.kicker{font:600 11pt system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;margin:0 0 4mm;color:#7a6a5c}
h1{font-size:20pt;margin:0 0 3mm}.lede{font-size:11pt;margin:0 0 5mm;max-width:95mm;line-height:1.35}
.qr{width:42mm;height:42mm}.qr svg{width:100%;height:100%}.hint{font:9pt system-ui,sans-serif;color:#7a6a5c;margin:3mm 0 0}
@media screen{body{background:#f4efe8;padding:16px}.sheet{background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.12)}}
</style></head><body><main class="sheet">${card}${card}</main></body></html>`;
}

export type AskChannel = "sms" | "whatsapp" | "email";

/** A short thank-you the owner sends to guests who opted in. Same words whatever the channel; email adds a subject. */
export function reviewAskMessage(restaurantName: string, url: string, channel: AskChannel): { subject?: string; body: string } {
  const body = `Thanks for coming to ${restaurantName}! If you enjoyed it, a quick Google review would mean a lot to us: ${url}`;
  return channel === "email" ? { subject: `Thanks for visiting ${restaurantName}`, body } : { body };
}
