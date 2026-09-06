/**
 * Daily outbound volume. Target 100 sends/UTC day (hard cap 100).
 * Fits Resend free-tier daily quota. Pipeline still preps ~100 ready emails.
 */
export const OUTBOUND_DAILY_TARGET = 100;
export const OUTBOUND_DAILY_FLOOR = 100;
export const OUTBOUND_DAILY_HARD_CAP = 100;

export function getOutboundSendBatch(): number {
  const n = Number(process.env.OUTBOUND_SEND_BATCH?.trim() || String(OUTBOUND_DAILY_TARGET)) || OUTBOUND_DAILY_TARGET;
  return Math.min(OUTBOUND_DAILY_HARD_CAP, Math.max(1, n));
}

export function getOutboundSendDelaySec(): number {
  return Math.max(1, Number(process.env.OUTBOUND_SEND_DELAY_SEC?.trim() || "1") || 1);
}

/** Cap per send wave. Default 100 so one wave can finish the day. */
export function getOutboundPerRunCap(): number {
  return Math.min(
    OUTBOUND_DAILY_HARD_CAP,
    Math.max(1, Number(process.env.OUTBOUND_SEND_PER_RUN?.trim() || String(OUTBOUND_DAILY_TARGET)) || OUTBOUND_DAILY_TARGET),
  );
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
