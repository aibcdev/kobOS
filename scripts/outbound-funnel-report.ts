/**
 * Outbound funnel by email variant and send week: sent → delivered → replied → audit email → signup → trial → paid.
 * Read-only.
 *
 *   npm run outbound:funnel              # last 8 weeks
 *   npm run outbound:funnel -- --weeks 2
 *
 * Gaps it can't fill: opens and clicks (not stored), and replies only if marked with outbound-sequence-mark.
 */
import { prisma } from "../lib/db/prisma";
import { bottleneck, funnelRows, per100, STAGES, type FunnelLead } from "../lib/outbound/funnel";

const weekOf = (d: Date) => {
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)));
  return monday.toISOString().slice(0, 10);
};

async function main() {
  const i = process.argv.indexOf("--weeks");
  const weeks = i > -1 ? Number(process.argv[i + 1]) : 8;
  const since = new Date(Date.now() - weeks * 7 * 86_400_000);

  const leads = await prisma.outboundLead.findMany({
    where: { sentAt: { gte: since } },
    select: { id: true, sentAt: true, emailVariant: true, visibilityAuditId: true },
  });
  const ids = leads.map((l) => l.id);
  const auditIds = leads.map((l) => l.visibilityAuditId).filter((x): x is string => Boolean(x));
  const [deliveries, sequences, audits] = await Promise.all([
    prisma.outboundDelivery.findMany({ where: { outboundLeadId: { in: ids } }, select: { outboundLeadId: true, deliveredAt: true, bouncedAt: true } }),
    prisma.outboundSequence.findMany({ where: { outboundLeadId: { in: ids } }, select: { outboundLeadId: true, emailReplied: true, sequenceStatus: true } }),
    prisma.visibilityAudit.findMany({ where: { id: { in: auditIds } }, select: { id: true, leadCapturedAt: true, restaurantId: true } }),
  ]);
  const restaurants = await prisma.restaurant.findMany({
    where: { id: { in: audits.map((a) => a.restaurantId).filter((x): x is string => Boolean(x)) } },
    select: { id: true, trialStartedAt: true, billingStatus: true },
  });

  const delivery = new Map(deliveries.map((d) => [d.outboundLeadId, d]));
  const sequence = new Map(sequences.map((s) => [s.outboundLeadId, s]));
  const audit = new Map(audits.map((a) => [a.id, a]));
  const restaurant = new Map(restaurants.map((r) => [r.id, r]));

  const rows: FunnelLead[] = leads.map((l) => {
    const d = delivery.get(l.id);
    const s = sequence.get(l.id);
    const a = l.visibilityAuditId ? audit.get(l.visibilityAuditId) : undefined;
    const r = a?.restaurantId ? restaurant.get(a.restaurantId) : undefined;
    return {
      cohort: `${l.emailVariant ?? "-"} · week of ${weekOf(l.sentAt!)}`,
      bounced: Boolean(d?.bouncedAt),
      delivered: Boolean(d?.deliveredAt),
      replied: Boolean(s?.emailReplied || s?.sequenceStatus === "REPLIED"),
      auditEmail: Boolean(a?.leadCapturedAt),
      signedUp: Boolean(a?.restaurantId),
      trial: Boolean(r?.trialStartedAt),
      paid: r?.billingStatus === "ACTIVE",
    };
  });

  console.log(`Outbound funnel, last ${weeks} weeks (${rows.length} sent). Per 100 sent in brackets.\n`);
  console.log(["cohort", ...STAGES, "bounced", "bottleneck"].join("\t"));
  for (const row of funnelRows(rows)) {
    const b = bottleneck(row);
    console.log(
      [
        row.cohort,
        ...STAGES.map((s) => (s === "sent" ? String(row.sent) : `${row[s]} (${per100(row[s], row.sent)})`)),
        `${row.bounced} (${per100(row.bounced, row.sent)})`,
        b ? `${b.from}→${b.to}: lost ${b.lost}` : "-",
      ].join("\t"),
    );
  }
  console.log("\nNot measured: opens and clicks (the Resend webhook ignores them). Replies count only if marked.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
