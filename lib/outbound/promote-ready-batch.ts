import { OutboundLeadStatus } from "@prisma/client";
import { parseAuditPayload } from "@/lib/audit/types";
import { prisma } from "@/lib/db/prisma";

/**
 * Promote up to `limit` PENDING_APPROVAL leads that already have:
 * contact email, message body, audit URL, and a ready audit scan.
 * Used by the daily 100-send cron so Resend can send without manual approve.
 */
export async function promoteReadyOutboundBatch(input: {
  workspaceRestaurantId: string;
  limit: number;
}): Promise<{ promoted: number; ids: string[] }> {
  const limit = Math.min(100, Math.max(1, input.limit));
  const candidates = await prisma.outboundLead.findMany({
    where: {
      workspaceRestaurantId: input.workspaceRestaurantId,
      status: OutboundLeadStatus.PENDING_APPROVAL,
      contactEmail: { not: null },
      messageBody: { not: null },
      auditUrl: { not: null },
      visibilityAuditId: { not: null },
    },
    orderBy: { createdAt: "asc" },
    take: limit * 3,
    select: {
      id: true,
      visibilityAuditId: true,
      messageBody: true,
      contactEmail: true,
    },
  });

  const auditIds = [...new Set(candidates.map((c) => c.visibilityAuditId!).filter(Boolean))];
  const audits = await prisma.visibilityAudit.findMany({
    where: { id: { in: auditIds } },
    select: { id: true, resultPayload: true },
  });
  const readyIds = new Set(
    audits
      .filter((a) => parseAuditPayload(a.resultPayload)?.scanStatus === "ready")
      .map((a) => a.id),
  );

  const toPromote = candidates
    .filter(
      (c) =>
        c.visibilityAuditId &&
        readyIds.has(c.visibilityAuditId) &&
        c.contactEmail?.trim() &&
        c.messageBody?.includes("/audit/"),
    )
    .slice(0, limit);

  const ids: string[] = [];
  for (const row of toPromote) {
    await prisma.outboundLead.update({
      where: { id: row.id },
      data: { status: OutboundLeadStatus.APPROVED },
    });
    ids.push(row.id);
  }

  return { promoted: ids.length, ids };
}
