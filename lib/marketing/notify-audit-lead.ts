import { Resend } from "resend";
import { parseAuditPayload } from "@/lib/audit/types";
import { formatDiscoverySummary, readStoredDiscovery } from "@/lib/marketing/audit-discovery";
import { prisma } from "@/lib/db/prisma";

export type AuditLeadNotifyResult = { ok: boolean; reason?: string };

function appOrigin(): string {
  return (
    process.env.NETLIFY_PRODUCTION_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://trykob.com"
  );
}

/**
 * Ops alert when an audit report is unlocked with email.
 * Includes food discovery answers so sales know budget / pain before calling.
 */
export async function notifyOpsAboutAuditLead(auditId: string): Promise<AuditLeadNotifyResult> {
  const audit = await prisma.visibilityAudit.findUnique({
    where: { id: auditId },
    select: {
      id: true,
      slug: true,
      restaurantName: true,
      city: true,
      websiteUrl: true,
      overallScore: true,
      leadEmail: true,
      leadPhone: true,
      leadCapturedAt: true,
      heardFrom: true,
      resultPayload: true,
      utmCampaign: true,
      utmSource: true,
    },
  });

  if (!audit?.leadEmail) {
    return { ok: false, reason: "no_lead_email" };
  }

  const key = process.env.RESEND_API_KEY?.trim();
  const to =
    process.env.OUTBOUND_RESEND_NOTIFY_EMAIL?.trim() ||
    process.env.RESEND_AUTH_FROM_EMAIL?.trim() ||
    "hello@trykob.com";
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.RESEND_AUTH_FROM_EMAIL?.trim() ||
    "KOB <onboarding@resend.dev>";

  if (!key) {
    console.warn("[notifyOpsAboutAuditLead] missing RESEND_API_KEY");
    return { ok: false, reason: "resend_missing" };
  }

  const origin = appOrigin();
  const path = audit.slug || audit.id;
  const reportUrl = `${origin}/audit/${path}`;
  const payload = parseAuditPayload(audit.resultPayload);
  const discovery = readStoredDiscovery(payload?.discovery ?? null);
  const discoveryLines = discovery
    ? formatDiscoverySummary(discovery).map((r) => `${r.label}: ${r.value}`)
    : ["(no discovery survey — API/MCP start)"];

  const text = [
    `Audit unlocked · ${audit.restaurantName}`,
    "",
    `Venue: ${audit.restaurantName} · ${audit.city}`,
    `Website: ${audit.websiteUrl || "—"}`,
    `Score: ${audit.overallScore}/100`,
    `Lead: ${audit.leadEmail}${audit.leadPhone ? ` · ${audit.leadPhone}` : ""}`,
    `Heard from: ${audit.heardFrom || "—"}`,
    `Campaign: ${audit.utmCampaign || audit.utmSource || "—"}`,
    `Report: ${reportUrl}`,
    "",
    "Discovery",
    ...discoveryLines.map((l) => `· ${l}`),
    "",
    "Call/email with budget + pain already known — do not re-ask the survey.",
  ].join("\n");

  try {
    const resend = new Resend(key);
    await resend.emails.send({
      from,
      to: [to],
      subject: `Audit lead · ${audit.restaurantName} · ${discovery?.willingnessToPay || discovery?.primaryGoal || "unlocked"}`,
      text,
    });
    return { ok: true };
  } catch (e) {
    console.error("[notifyOpsAboutAuditLead]", e);
    return { ok: false, reason: "send_failed" };
  }
}
