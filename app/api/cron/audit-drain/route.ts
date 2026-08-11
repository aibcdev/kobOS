import { NextResponse } from "next/server";
import { executeAuditPipeline } from "@/lib/audit/execute-audit-pipeline";
import { parseAuditPayload } from "@/lib/audit/types";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Drain stuck free audits (overallScore=0 / not ready).
 * Auth: Bearer CRON_SECRET.
 * Safe to call every 1–2 minutes from Netlify scheduled functions.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - 6 * 3600_000);
  const pending = await prisma.visibilityAudit.findMany({
    where: {
      overallScore: 0,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "asc" },
    take: 5,
    select: { id: true, websiteUrl: true, resultPayload: true, overallScore: true },
  });

  const results: { id: string; status: string; detail?: string }[] = [];

  for (const row of pending) {
    const payload = parseAuditPayload(row.resultPayload);
    if (payload?.scanStatus === "ready" || (row.overallScore ?? 0) > 0) {
      results.push({ id: row.id, status: "skipped_ready" });
      continue;
    }
    const websiteUrl = row.websiteUrl?.trim();
    if (!websiteUrl) {
      results.push({ id: row.id, status: "skipped_no_url" });
      continue;
    }
    try {
      await executeAuditPipeline(row.id, { websiteUrl, siteScope: "one" });
      results.push({ id: row.id, status: "processed" });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("[cron/audit-drain]", row.id, message);
      results.push({ id: row.id, status: "failed", detail: message.slice(0, 200) });
    }
  }

  return NextResponse.json({
    ok: true,
    checked: pending.length,
    results,
  });
}
