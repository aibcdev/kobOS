import { NextResponse } from "next/server";

export const runtime = "nodejs";
/** Long scans — honored on Netlify Pro / compatible hosts. */
export const maxDuration = 300;

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Internal/background processor for free audits.
 * Auth: Bearer CRON_SECRET (or x-cron-secret).
 * Dynamic imports keep cold-start failures inside try/catch.
 */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const secret = process.env.CRON_SECRET?.trim();
    const auth = req.headers.get("authorization")?.trim() || "";
    const headerSecret = req.headers.get("x-cron-secret")?.trim() || "";
    const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : headerSecret;
    if (!secret || token !== secret) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { prisma } = await import("@/lib/db/prisma");
    const { parseAuditPayload } = await import("@/lib/audit/types");
    const { executeAuditPipeline } = await import("@/lib/audit/execute-audit-pipeline");

    const { id } = await params;
    const key = id.trim();
    const audit =
      (await prisma.visibilityAudit.findUnique({
        where: { id: key },
        select: { id: true, websiteUrl: true, resultPayload: true, overallScore: true },
      })) ||
      (await prisma.visibilityAudit.findUnique({
        where: { slug: key },
        select: { id: true, websiteUrl: true, resultPayload: true, overallScore: true },
      }));

    if (!audit) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const existing = parseAuditPayload(audit.resultPayload);
    if (existing?.scanStatus === "ready" || (audit.overallScore ?? 0) > 0) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        scanStatus: existing?.scanStatus ?? "ready",
      });
    }

    const websiteUrl = audit.websiteUrl?.trim();
    if (!websiteUrl) {
      return NextResponse.json({ error: "missing_website" }, { status: 400 });
    }

    await executeAuditPipeline(audit.id, { websiteUrl, siteScope: "one" });

    const refreshed = await prisma.visibilityAudit.findUnique({
      where: { id: audit.id },
      select: { resultPayload: true, overallScore: true },
    });
    const payload = parseAuditPayload(refreshed?.resultPayload);

    return NextResponse.json({
      ok: true,
      scanStatus: payload?.scanStatus ?? null,
      overallScore: refreshed?.overallScore ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[audit/process]", message);
    return NextResponse.json({ error: "process_failed", message }, { status: 500 });
  }
}
