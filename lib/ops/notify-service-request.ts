/**
 * Email the KOB operator when any service request is queued (ticket).
 */
export async function notifyOperatorServiceRequest(input: {
  restaurantName: string;
  restaurantId: string;
  ownerEmail: string | null;
  title: string;
  type: string;
  notes?: string | null;
  creditCost: number;
  requestId: string;
  auditId?: string | null;
}): Promise<{ ok: boolean; reason?: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  const to =
    process.env.OUTBOUND_RESEND_NOTIFY_EMAIL?.trim() ||
    process.env.RESEND_AUTH_FROM_EMAIL?.trim() ||
    null;
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.RESEND_AUTH_FROM_EMAIL?.trim() ||
    "KOB <onboarding@resend.dev>";

  if (!key || !to) {
    console.warn("[notifyOperatorServiceRequest] missing RESEND_API_KEY or notify email");
    return { ok: false, reason: "resend_or_notify_email_missing" };
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://trykob.com";
  const queueUrl = `${origin}/ops/requests`;
  const auditLine = input.auditId ? `Audit: ${origin}/audit/${input.auditId}` : "Audit: (none linked)";
  const notes = input.notes?.trim() || "(none)";

  const text = [
    "New service ticket (REQUESTED)",
    "",
    `Restaurant: ${input.restaurantName}`,
    `Restaurant ID: ${input.restaurantId}`,
    `Owner email: ${input.ownerEmail ?? "(unknown)"}`,
    `Type: ${input.type}`,
    `Title: ${input.title}`,
    `Credits: ${input.creditCost}`,
    `Notes: ${notes}`,
    auditLine,
    `Request ID: ${input.requestId}`,
    "",
    `Open the ops queue: ${queueUrl}`,
    "Pick up the ticket (In progress) → deliver the work → mark Delivered.",
  ].join("\n");

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(key);
    await resend.emails.send({
      from,
      to: [to],
      subject: `[KOB] Ticket: ${input.title} — ${input.restaurantName}`,
      text,
    });
    return { ok: true };
  } catch (e) {
    console.error("[notifyOperatorServiceRequest]", e);
    return { ok: false, reason: e instanceof Error ? e.message : "send_failed" };
  }
}
