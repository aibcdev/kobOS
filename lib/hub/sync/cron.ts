/** Minimal 5-field cron (UTC): `*`, `n`, `a-b`, lists and `/step`. Enough for manifest stream schedules. */

const RANGES: [number, number][] = [
  [0, 59],
  [0, 23],
  [1, 31],
  [1, 12],
  [0, 6],
];

function field(spec: string, [lo, hi]: [number, number]): Set<number> {
  const out = new Set<number>();
  for (const part of spec.split(",")) {
    const [range, stepRaw] = part.split("/");
    const step = stepRaw ? Number(stepRaw) : 1;
    const [a, end] = range === "*" ? [lo, hi] : range.split("-").map(Number);
    const b = end ?? (stepRaw ? hi : a);
    if (![a, b, step].every(Number.isInteger) || step < 1 || a < lo || b > hi || a > b) throw new Error(`Bad cron field "${spec}"`);
    for (let v = a; v <= b; v += step) out.add(v);
  }
  return out;
}

export function parseCron(expr: string): Set<number>[] {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) throw new Error(`Cron needs 5 fields: "${expr}"`);
  return parts.map((p, i) => field(p, RANGES[i]));
}

/** First minute strictly after `from` that matches. Day-of-month and day-of-week are ANDed unless one is `*`. */
export function nextCronTime(expr: string, from: Date): Date {
  const [min, hour, dom, mon, dow] = parseCron(expr);
  const [, , domRaw, , dowRaw] = expr.trim().split(/\s+/);
  const t = new Date(from.getTime());
  t.setUTCSeconds(0, 0);
  t.setUTCMinutes(t.getUTCMinutes() + 1);
  const limit = from.getTime() + 366 * 86_400_000;
  while (t.getTime() <= limit) {
    const dayOk =
      domRaw === "*" || dowRaw === "*" ? dom.has(t.getUTCDate()) && dow.has(t.getUTCDay()) : dom.has(t.getUTCDate()) || dow.has(t.getUTCDay());
    if (!mon.has(t.getUTCMonth() + 1) || !dayOk) {
      t.setUTCDate(t.getUTCDate() + 1);
      t.setUTCHours(0, 0, 0, 0);
      continue;
    }
    if (!hour.has(t.getUTCHours())) {
      t.setUTCHours(t.getUTCHours() + 1, 0, 0, 0);
      continue;
    }
    if (!min.has(t.getUTCMinutes())) {
      t.setUTCMinutes(t.getUTCMinutes() + 1, 0, 0);
      continue;
    }
    return t;
  }
  throw new Error(`Cron "${expr}" never fires`);
}
