import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/db/prisma";
import { suppressOutboundEmail } from "@/lib/outbound/suppression";
import { mapResendDeliveryEvent } from "@/lib/outbound/resend-event";

export const runtime = "nodejs";

type ResendWebhook = {
  type: string;
  data?: {
    email_id?: string;
    to?: string[];
  };
};

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }
  const id = req.headers.get("svix-id");
  const timestamp = req.headers.get("svix-timestamp");
  const signature = req.headers.get("svix-signature");
  if (!id || !timestamp || !signature) {
    return NextResponse.json({ error: "Missing signature headers" }, { status: 400 });
  }

  const raw = await req.text();
  let event: ResendWebhook;
  try {
    event = new Webhook(secret).verify(raw, {
      "svix-id": id,
      "svix-timestamp": timestamp,
      "svix-signature": signature,
    }) as ResendWebhook;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const providerMessageId = event.data?.email_id;
  if (!providerMessageId) return NextResponse.json({ received: true, ignored: true });

  const delivery = await prisma.outboundDelivery.findUnique({
    where: { providerMessageId },
    include: { outboundLead: { select: { contactEmail: true } } },
  });
  if (!delivery) return NextResponse.json({ received: true, unmatched: true });

  const now = new Date();
  const mapped = mapResendDeliveryEvent(event.type);
  if (mapped?.status === "DELIVERED") {
    await prisma.outboundDelivery.update({
      where: { id: delivery.id },
      data: { status: "DELIVERED", deliveredAt: now },
    });
  } else if (mapped?.suppressReason) {
    const complaint = mapped.suppressReason === "complaint";
    await prisma.outboundDelivery.update({
      where: { id: delivery.id },
      data: complaint
        ? { status: "COMPLAINED", complainedAt: now }
        : { status: "BOUNCED", bouncedAt: now },
    });
    const email = delivery.outboundLead.contactEmail ?? event.data?.to?.[0];
    if (email) {
      await suppressOutboundEmail({
        email,
        reason: mapped.suppressReason,
        source: "resend_webhook",
        providerMessageId,
      });
    }
  }

  return NextResponse.json({ received: true });
}
