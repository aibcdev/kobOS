/**
 * The outbound funnel, one row per cohort: sent → delivered → replied → audit email → signup → trial → paid.
 * Pure, so the report script and tests share it. Opens and clicks aren't recorded (the Resend webhook ignores them),
 * and replies are only as good as scripts/outbound-sequence-mark.ts being run.
 */

export type FunnelLead = {
  cohort: string;
  bounced: boolean;
  delivered: boolean;
  replied: boolean;
  auditEmail: boolean;
  signedUp: boolean;
  trial: boolean;
  paid: boolean;
};

export const STAGES = ["sent", "delivered", "replied", "auditEmail", "signedUp", "trial", "paid"] as const;
export type Stage = (typeof STAGES)[number];
export type FunnelRow = { cohort: string } & Record<Stage, number> & { bounced: number };

export function funnelRows(leads: FunnelLead[]): FunnelRow[] {
  const by = new Map<string, FunnelRow>();
  for (const l of leads) {
    const row =
      by.get(l.cohort) ??
      ({ cohort: l.cohort, sent: 0, delivered: 0, replied: 0, auditEmail: 0, signedUp: 0, trial: 0, paid: 0, bounced: 0 } as FunnelRow);
    row.sent++;
    if (l.bounced) row.bounced++;
    if (l.delivered) row.delivered++;
    if (l.replied) row.replied++;
    if (l.auditEmail) row.auditEmail++;
    if (l.signedUp) row.signedUp++;
    if (l.trial) row.trial++;
    if (l.paid) row.paid++;
    by.set(l.cohort, row);
  }
  return [...by.values()].sort((a, b) => a.cohort.localeCompare(b.cohort));
}

/** Per 100 sent, to compare cohorts of different sizes. */
export const per100 = (n: number, sent: number) => (sent ? Math.round((n / sent) * 1000) / 10 : 0);

/**
 * Where the most people drop out (Wilmo names one bottleneck per channel). Ranked by people lost, not percentage, so
 * 2 of 2 replies not signing up doesn't outrank 98 of 100 never replying.
 */
export function bottleneck(row: FunnelRow): { from: Stage; to: Stage; lost: number; kept: number } | null {
  let worst: { from: Stage; to: Stage; lost: number; kept: number } | null = null;
  for (let i = 1; i < STAGES.length; i++) {
    const from = STAGES[i - 1];
    const to = STAGES[i];
    if (!row[from]) break;
    const lost = row[from] - row[to];
    if (!worst || lost > worst.lost) worst = { from, to, lost, kept: row[to] / row[from] };
  }
  return worst;
}
