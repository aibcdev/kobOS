import { prisma } from "@/lib/db/prisma";

export type OpsNotifyResult = { ok: boolean; reason?: string };

const NOTIFY_FAILED_MARKER = "[ops-email-failed]";

function appOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://trykob.com";
}

function planLabel(plan: string): string {
  return plan.charAt(0) + plan.slice(1).toLowerCase();
}

/**
 * Ops alert for a queued ticket.
 *
 * Every field is read back from the row after it is written, so the operator can
 * never be shown a value the product did not actually record. If the email cannot
 * be sent, the ticket is stamped so the queue at /ops/requests shows it was missed.
 */
export async function notifyOpsAboutServiceRequest(
  requestId: string,
  opts?: { requestedByEmail?: string | null; source?: string },
): Promise<OpsNotifyResult> {
  const request = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    include: {
      restaurant: {
        select: {
          id: true,
          name: true,
          city: true,
          website: true,
          subscriptionPlan: true,
          members: {
            where: { role: "OWNER" },
            take: 1,
            include: { user: { select: { email: true } } },
          },
        },
      },
    },
  });

  if (!request) {
    console.error("[notifyOpsAboutServiceRequest] request not found", requestId);
    return { ok: false, reason: "request_not_found" };
  }

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
    console.warn("[notifyOpsAboutServiceRequest] missing RESEND_API_KEY or notify email");
    await stampNotifyFailure(request.id, request.notes, "resend_or_notify_email_missing");
    return { ok: false, reason: "resend_or_notify_email_missing" };
  }

  const origin = appOrigin();
  const audit = await prisma.visibilityAudit.findFirst({
    where: { restaurantId: request.restaurantId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, slug: true },
  });

  const ownerEmail =
    request.restaurant.members[0]?.user.email ?? opts?.requestedByEmail?.trim() ?? null;
  const auditRef = audit?.slug || audit?.id || null;

  const text = [
    `New ticket · ${request.status}`,
    "",
    `Restaurant: ${request.restaurant.name}`,
    request.restaurant.city ? `City: ${request.restaurant.city}` : null,
    `Plan: ${planLabel(request.restaurant.subscriptionPlan)}`,
    `Owner email: ${ownerEmail ?? "(unknown)"}`,
    request.restaurant.website ? `Website: ${request.restaurant.website}` : null,
    "",
    `Type: ${request.type}`,
    `Title: ${request.title}`,
    `Credits charged: ${request.creditCost}`,
    `Requested: ${request.createdAt.toISOString()}`,
    opts?.source ? `Raised from: ${opts.source}` : null,
    "",
    "Notes:",
    request.notes.trim() || "(none)",
    "",
    auditRef ? `Audit: ${origin}/audit/${auditRef}` : "Audit: (none linked)",
    `Ticket: ${origin}/ops/requests`,
    `Request ID: ${request.id}`,
    `Restaurant ID: ${request.restaurantId}`,
    "",
    "Pick it up (In progress) → do the work → mark Delivered.",
  ]
    .filter((line) => line !== null)
    .join("\n");

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(key);
    await resend.emails.send({
      from,
      to: [to],
      subject: `[KOB] ${request.title} — ${request.restaurant.name}`,
      text,
    });
    return { ok: true };
  } catch (e) {
    const reason = e instanceof Error ? e.message : "send_failed";
    console.error("[notifyOpsAboutServiceRequest]", e);
    await stampNotifyFailure(request.id, request.notes, reason);
    return { ok: false, reason };
  }
}

/** Make a missed alert visible in the ops queue instead of silently losing it. */
async function stampNotifyFailure(requestId: string, notes: string, reason: string) {
  if (notes.includes(NOTIFY_FAILED_MARKER)) return;
  try {
    await prisma.serviceRequest.update({
      where: { id: requestId },
      data: {
        notes: `${notes}\n${NOTIFY_FAILED_MARKER} email alert did not send (${reason}) — spotted in queue only.`.trim(),
      },
    });
  } catch (e) {
    console.error("[notifyOpsAboutServiceRequest] could not stamp failure", e);
  }
}
