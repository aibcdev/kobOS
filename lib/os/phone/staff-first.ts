/** Staff first: restaurant phone rings; KOB only after miss. */
export const STAFF_RING_MS = 15_000;

export type CallLeg = "ringing_staff" | "human" | "guest_kob";

export function nextLeg(input: {
  staffAnswered: boolean;
  elapsedMs: number;
}): CallLeg {
  if (input.staffAnswered) return "human";
  if (input.elapsedMs < STAFF_RING_MS) return "ringing_staff";
  return "guest_kob";
}
