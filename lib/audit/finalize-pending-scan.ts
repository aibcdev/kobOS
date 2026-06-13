import { prisma } from "@/lib/db/prisma";
import { parseAuditPayload, type AuditResultPayload } from "@/lib/audit/types";

/** Mark a stuck pending audit as ready so the results page can load. */
export async function finalizePendingAuditScan(auditId: string): Promise<boolean> {
  const audit = await prisma.visibilityAudit.findUnique({ where: { id: auditId } });
  if (!audit) return false;

  const prev = parseAuditPayload(audit.resultPayload);
  if (!prev || prev.scanStatus !== "pending") return false;

  const updated: AuditResultPayload = {
    ...prev,
    scanStatus: "ready",
    scoresPending: false,
  };

  await prisma.visibilityAudit.update({
    where: { id: auditId },
    data: { resultPayload: updated as object },
  });

  return true;
}

/** Mark a stuck pending audit as failed after a background job error. */
export async function failPendingAuditScan(auditId: string, message: string): Promise<boolean> {
  const audit = await prisma.visibilityAudit.findUnique({ where: { id: auditId } });
  if (!audit) return false;

  const prev = parseAuditPayload(audit.resultPayload);
  if (!prev || prev.scanStatus !== "pending") return false;

  const updated: AuditResultPayload = {
    ...prev,
    scoresPending: false,
    scanStatus: "failed",
    browserbaseScan: {
      ...prev.browserbaseScan,
      capturedAt: new Date().toISOString(),
      mode: "async-failed",
      errorMessage: message.slice(0, 500),
    },
  };

  await prisma.visibilityAudit.update({
    where: { id: auditId },
    data: {
      resultPayload: updated as object,
      overallScore: updated.scores.overall,
      seoScore: updated.scores.seo,
      designScore: updated.scores.design,
      mobileScore: updated.scores.mobile,
      conversionScore: updated.scores.conversion,
    },
  });

  return true;
}
