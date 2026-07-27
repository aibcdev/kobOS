/**
 * Email the KOB operator when a restaurant owner requests a manual fix.
 */
export async function notifyOperatorFixRequested(input: {
  restaurantName: string;
  restaurantId: string;
  ownerEmail: string | null;
  fixTitle: string;
  fixDetail?: string | null;
  auditId?: string | null;
  requestId: string;
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
    console.warn("[notifyOperatorFixRequested] missing RESEND_API_KEY or notify email");
    return { ok: false, reason: "resend_or_notify_email_missing" };
  }

  const auditLine = input.auditId
    ? `Audit: https://trykob.com/audit/${input.auditId}`
    : "Audit: (none linked)";
  const detail = input.fixDetail?.trim() || "(no detail)";

  const text = [
    "New manual fix request (PENDING)",
    "",
    `Restaurant: ${input.restaurantName}`,
    `Restaurant ID: ${input.restaurantId}`,
    `Owner email: ${input.ownerEmail ?? "(unknown)"}`,
    `Fix: ${input.fixTitle}`,
    `Detail: ${detail}`,
    auditLine,
    `Request ID: ${input.requestId}`,
    "",
    "Do this manually, then mark Delivered in the ops queue:",
    "https://trykob.com/ops/requests",
  ].join("\n");

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(key);
    await resend.emails.send({
      from,
      to: [to],
      subject: `[KOB] Fix requested: ${input.fixTitle} — ${input.restaurantName}`,
      text,
    });
    return { ok: true };
  } catch (e) {
    console.error("[notifyOperatorFixRequested]", e);
    return { ok: false, reason: e instanceof Error ? e.message : "send_failed" };
  }
}
