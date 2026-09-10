import { NextResponse } from "next/server";
import { assertOpsStatusAccess } from "@/lib/ops/assert-ops-status-access";
import { getStripe } from "@/lib/billing/stripe-server";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = assertOpsStatusAccess(req);
  if (denied) return denied;

  const now = Date.now();
  const staleAuditBefore = new Date(now - 10 * 60_000);
  const [dbProbe, heartbeats, queueReady, deliveryCounts, suppressed, stuckAudits] = await Promise.all([
    prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`,
    prisma.opsHeartbeat.findMany(),
    prisma.outboundLead.count({
      where: {
        status: "APPROVED",
        contactEmail: { not: null },
        messageBody: { contains: "/audit/" },
      },
    }),
    prisma.outboundDelivery.groupBy({ by: ["status"], _count: true }),
    prisma.outboundSuppression.count(),
    prisma.visibilityAudit.count({
      where: {
        processingCompletedAt: null,
        processingStartedAt: { lt: staleAuditBefore },
      },
    }),
  ]);

  let stripeOk = false;
  try {
    const stripe = getStripe();
    stripeOk = Boolean(stripe && (await stripe.accounts.retrieve()).id);
  } catch {
    stripeOk = false;
  }

  const requiredEnv = [
    "DATABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "INNGEST_SIGNING_KEY",
    "INNGEST_EVENT_KEY",
    "OPS_ALERT_EMAIL",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_STARTER",
    "STRIPE_PRICE_PRO",
    "GOOGLE_PLACES_API_KEY",
    "CRON_SECRET",
  ];
  const missingEnv = requiredEnv.filter((key) => !process.env[key]?.trim());
  const heartbeatState = Object.fromEntries(
    heartbeats.map((heartbeat) => [
      heartbeat.key,
      {
        lastSuccessAt: heartbeat.lastSuccessAt.toISOString(),
        ageMinutes: Math.round((now - heartbeat.lastSuccessAt.getTime()) / 60_000),
      },
    ]),
  );
  const delivery = Object.fromEntries(deliveryCounts.map((row) => [row.status, row._count]));
  const criticalOk = dbProbe.length === 1 && stripeOk && missingEnv.length === 0;

  return NextResponse.json(
    {
      ok: criticalOk,
      checkedAt: new Date(now).toISOString(),
      dependencies: {
        database: dbProbe.length === 1,
        stripe: stripeOk,
        supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
        inngest: Boolean(process.env.INNGEST_SIGNING_KEY && process.env.INNGEST_EVENT_KEY),
        outboundSender: "GROK_GMAIL",
        resendOptional: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
        places: Boolean(process.env.GOOGLE_PLACES_API_KEY),
      },
      missingEnv,
      outbound: { queueReady, delivery, suppressed },
      audits: { stuck: stuckAudits },
      heartbeats: heartbeatState,
    },
    { status: criticalOk ? 200 : 503 },
  );
}
