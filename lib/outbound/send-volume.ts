/**
 * Daily outbound volume. Target 300–400 sends/UTC day (hard cap 400).
 * Resend must allow this quota — free 100/day will fail past 100 until the account is on a paid plan.
 */
export const OUTBOUND_DAILY_TARGET = 400;
export const OUTBOUND_DAILY_FLOOR = 300;
export const OUTBOUND_DAILY_HARD_CAP = 400;

export function getOutboundSendBatch(): number {
  const n = Number(process.env.OUTBOUND_SEND_BATCH?.trim() || String(OUTBOUND_DAILY_TARGET)) || OUTBOUND_DAILY_TARGET;
  return Math.min(OUTBOUND_DAILY_HARD_CAP, Math.max(1, n));
}

export function getOutboundSendDelaySec(): number {
  return Math.max(1, Number(process.env.OUTBOUND_SEND_DELAY_SEC?.trim() || "1") || 1);
}

/** Cap per Inngest/HTTP wave so 3 daily runs can hit 400 without a 2h step storm. */
export function getOutboundPerRunCap(): number {
  return Math.min(OUTBOUND_DAILY_HARD_CAP, Math.max(50, Number(process.env.OUTBOUND_SEND_PER_RUN?.trim() || "160") || 160));
}

export function remainingSendForDay(sentToday: number): number {
  return Math.max(0, OUTBOUND_DAILY_HARD_CAP - sentToday);
}

export function utcDayBounds(day = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}
