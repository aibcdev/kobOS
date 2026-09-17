export type ReliabilityParts = {
  d: number;
  e: number;
  v: number;
  c: number;
  f: number;
  u: number;
};

export type AutonomyBand = "insight" | "suggest" | "limited_autopilot" | "autopilot_eligible";

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/** R_w = 0.25D + 0.20E + 0.20V + 0.15C + 0.10F + 0.10U */
export function reliabilityScore(p: ReliabilityParts): number {
  return (
    0.25 * clamp01(p.d) +
    0.2 * clamp01(p.e) +
    0.2 * clamp01(p.v) +
    0.15 * clamp01(p.c) +
    0.1 * clamp01(p.f) +
    0.1 * clamp01(p.u)
  );
}

export function autonomyFromReliability(score: number): AutonomyBand {
  if (score < 0.85) return "insight";
  if (score < 0.92) return "suggest";
  if (score <= 0.97) return "limited_autopilot";
  return "autopilot_eligible";
}
