import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/db/prisma";
import { markOpsHeartbeat } from "@/lib/ops/heartbeat";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const [ready, sentToday, stuckAudits, heartbeats] = await Promise.all([
    prisma.outboundLead.count({ where: { status: "APPROVED", contactEmail: { not: null } } }),
    prisma.outboundDelivery.count({ where: { sentAt: { gte: today } } }),
    prisma.visibilityAudit.count({
      where: {
        processingCompletedAt: null,
        processingStartedAt: { lt: new Date(now.getTime() - 10 * 60_000) },
      },
    }),
    prisma.opsHeartbeat.findMany(),
  ]);
  const heartbeat = new Map(heartbeats.map((row) => [row.key, row.lastSuccessAt]));
  const problems: string[] = [];
  if (ready < 100) problems.push(`Only ${ready} approved outbound emails are ready (target: 100).`);
  if (now.getUTCHours() >= 20 && sentToday < 100) {
    problems.push(`Only ${sentToday} outbound emails have been submitted today (target: 100).`);
  }
  if (stuckAudits > 0) problems.push(`${stuckAudits} audits have been processing for over 10 minutes.`);
  const auditDrain = heartbeat.get("audit-drain");
  if (!auditDrain || now.getTime() - auditDrain.getTime() > 10 * 60_000) {
    problems.push("Audit drain heartbeat is stale.");
  }

  if (problems.length) {
    const key = process.env.RESEND_API_KEY?.trim();
    const to = process.env.OPS_ALERT_EMAIL?.trim();
    const from = process.env.RESEND_FROM_EMAIL?.trim();
    if (key && to && from) {
      await new Resend(key).emails.send({
        from,
        to: [to],
        subject: `KOB needs attention: ${problems.length} reliability alert${problems.length === 1 ? "" : "s"}`,
        text: `KOB automated health check found:\n\n${problems.map((problem) => `- ${problem}`).join("\n")}\n\nChecked ${now.toISOString()}`,
      });
    }
  }
  await markOpsHeartbeat("health-watch", { problems, ready, sentToday, stuckAudits });
  return NextResponse.json({ ok: problems.length === 0, problems, ready, sentToday, stuckAudits });
}
