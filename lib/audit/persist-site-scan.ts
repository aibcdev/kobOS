import { Prisma } from "@prisma/client";
import type { AuditResultPayload } from "@/lib/audit/types";
import { prisma } from "@/lib/db/prisma";

/** Normalized scan row for analytics; optional — fails open if DB errors. */
export async function upsertSiteScanForAudit(auditId: string, payload: AuditResultPayload): Promise<void> {
  try {
    const sessionId = payload.browserbaseScan?.sessionId ?? null;
    const urls: string[] = [];
    if (payload.browserbaseScan?.screenshotPublicUrl) {
      urls.push(payload.browserbaseScan.screenshotPublicUrl);
    }
    const rawStagehand = payload.stagehandExtraction
      ? (JSON.parse(JSON.stringify(payload.stagehandExtraction)) as Prisma.InputJsonValue)
      : undefined;
    const visual = payload.visualMetrics
      ? (JSON.parse(JSON.stringify(payload.visualMetrics)) as Prisma.InputJsonValue)
      : undefined;

    await prisma.siteScan.upsert({
      where: { visibilityAuditId: auditId },
      create: {
        visibilityAuditId: auditId,
        browserbaseSessionId: sessionId,
        screenshotUrls: urls,
        ...(rawStagehand !== undefined ? { rawStagehandJson: rawStagehand } : {}),
        ...(visual !== undefined ? { visualMetricsJson: visual } : {}),
      },
      update: {
        ...(sessionId ? { browserbaseSessionId: sessionId } : {}),
        screenshotUrls: urls.length ? urls : undefined,
        ...(rawStagehand !== undefined ? { rawStagehandJson: rawStagehand } : {}),
        ...(visual !== undefined ? { visualMetricsJson: visual } : {}),
      },
    });
  } catch (e) {
    console.warn("[site-scan] upsert skipped", e);
  }
}
