import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { inngest } from "@/inngest/client";
import { INBOUND_EMAIL_EVENT } from "@/inngest/imports";
import { parseInboundAddress } from "@/lib/hub/imports/inbound";

export const runtime = "nodejs";

type Received = { type?: string; data?: { email_id?: string; to?: string[] } };

/**
 * Resend Receiving webhook (`email.received`) for data+/bookings+/invoices+ addresses. Verifies the Svix signature,
 * keeps only valid KOB import addresses, and hands off to `kob-import-inbound-email`; nothing slow runs here.
 */
export async function POST(req: Request) {
  const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };
  let event: Received;
  try {
    event = new Webhook(secret).verify(await req.text(), headers) as Received;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  if (event.type !== "email.received" || !event.data?.email_id) return NextResponse.json({ ignored: true });

  let to: string[] = [];
  try {
    to = (event.data.to ?? []).filter((a) => parseInboundAddress(a) !== null);
  } catch {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  if (!to.length) return NextResponse.json({ ignored: true });
  // Inngest dedupes on the event id, so Resend redeliveries don't create a second run.
  await inngest.send({ id: `inbound-${event.data.email_id}`, name: INBOUND_EMAIL_EVENT, data: { emailId: event.data.email_id, to } });
  return NextResponse.json({ received: true });
}
