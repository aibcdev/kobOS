import { OutboundLeadSource, OutboundLeadStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { parseAuditPayload } from "@/lib/audit/types";

export type ImportAuditLeadsResult = {
  scanned: number;
  inserted: number;
  skipped: number;
};

/**
 * Turn unlocked visibility audits (with email) into outbound queue rows for sales follow-up.
 */
export async function importAuditLeadsToOutbound(
  workspaceRestaurantId: string,
  options?: { max?: number; daysBack?: number },
): Promise<ImportAuditLeadsResult> {
  const max = Math.min(50, Math.max(1, options?.max ?? 25));
  const daysBack = Math.min(90, Math.max(1, options?.daysBack ?? 30));
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  const audits = await prisma.visibilityAudit.findMany({
    where: {
      leadEmail: { not: null },
      leadCapturedAt: { gte: since },
    },
    orderBy: { leadCapturedAt: "desc" },
    take: max * 2,
  });

  const existingEmails = new Set(
    (
      await prisma.outboundLead.findMany({
        where: { workspaceRestaurantId, contactEmail: { not: null } },
        select: { contactEmail: true },
      })
    )
      .map((r) => r.contactEmail?.trim().toLowerCase())
      .filter(Boolean),
  );

  let inserted = 0;
  let skipped = 0;

  for (const audit of audits) {
    if (inserted >= max) break;
    const email = audit.leadEmail?.trim();
    if (!email) continue;
    const key = email.toLowerCase();
    if (existingEmails.has(key)) {
      skipped++;
      continue;
    }

    const payload = parseAuditPayload(audit.resultPayload);
    const topIssue =
      payload?.issues[0]?.title ?? payload?.opportunities[0]?.title ?? "online visibility gaps";
    const score = audit.overallScore;

    const messageSubject = `${audit.restaurantName}: quick note on your online visibility`;
    const messageBody = [
      `Hi — you recently ran a visibility scan for ${audit.restaurantName} in ${audit.city}.`,
      ``,
      `Your overall score came back at ${score}/100. One area that stood out: ${topIssue}.`,
      ``,
      `We help independent restaurants fix gaps like this (site, Google, photos, reviews) and grow direct orders — without marketplace fees eating margin.`,
      ``,
      `Would a 15-minute walkthrough of your scan results be useful this week?`,
      ``,
      `— KOB`,
    ].join("\n");

    await prisma.outboundLead.create({
      data: {
        workspaceRestaurantId,
        city: audit.city,
        restaurantName: audit.restaurantName,
        websiteUrl: audit.websiteUrl,
        contactEmail: email,
        insightSummary: `Audit lead · score ${score}/100 · ${topIssue}`,
        messageSubject,
        messageBody,
        suggestedTone: "helpful",
        status: OutboundLeadStatus.PENDING_APPROVAL,
        source: OutboundLeadSource.AUDIT,
      },
    });

    existingEmails.add(key);
    inserted++;
  }

  return { scanned: audits.length, inserted, skipped };
}
