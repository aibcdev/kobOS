import sharp from "sharp";

/**
 * No-reference heuristics from a single screenshot (usually viewport PNG).
 * `brisqueApprox` is NOT paper-accurate BRISQUE — variance/brightness-style proxy only.
 */
export type AuditVisualIntelligenceResult = {
  version: 1;
  computedAt: string;
  /** Higher = noisier / worse (0–100 heuristic). */
  brisqueApprox: number;
  sharpnessScore: number;
  vibrancyScore: number;
  contrastScore: number;
  /** Warm-tone bias often correlates with food photography (heuristic). */
  foodWarmthHeuristic: number;
  /** Weighted blend for scoring nudges (0–100). */
  overallHeuristic: number;
  notes: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Unit-testable helpers when `stats` comes from sharp. */
export function heuristicFromSharpStats(stats: sharp.Stats): Omit<AuditVisualIntelligenceResult, "version" | "computedAt" | "notes"> & { notes?: string } {
  const r = stats.channels[0];
  const g = stats.channels[1];
  const b = stats.channels[2];
  const meanR = r?.mean ?? 128;
  const stdR = r?.stdev ?? 0;
  const stdG = g?.stdev ?? 0;
  const stdB = b?.stdev ?? 0;
  const meanSat = (stdG + stdB) / 2;

  const brisqueApprox = clamp(25 + stdR * 2.2 + Math.abs(meanR - 128) / 3, 0, 95);
  const sharpnessScore = clamp(stdR * 3.2, 0, 100);
  const vibrancyScore = clamp(meanSat * 2.3, 0, 100);
  const rangeR = (r?.max ?? 255) - (r?.min ?? 0);
  const contrastScore = clamp(rangeR * 0.45, 0, 100);
  const warmBias = meanR > 110 && meanR < 200 ? 12 : meanR <= 110 ? 4 : 0;
  const foodWarmthHeuristic = clamp(55 + warmBias + vibrancyScore * 0.22, 0, 100);
  const overallHeuristic = Math.round(
    clamp(100 - brisqueApprox, 0, 100) * 0.38 + sharpnessScore * 0.22 + foodWarmthHeuristic * 0.4,
  );

  return {
    brisqueApprox: Math.round(brisqueApprox * 10) / 10,
    sharpnessScore: Math.round(sharpnessScore * 10) / 10,
    vibrancyScore: Math.round(vibrancyScore * 10) / 10,
    contrastScore: Math.round(contrastScore * 10) / 10,
    foodWarmthHeuristic: Math.round(foodWarmthHeuristic * 10) / 10,
    overallHeuristic: clamp(overallHeuristic, 0, 100),
  };
}

export async function analyzeScreenshotBuffer(buf: Buffer): Promise<AuditVisualIntelligenceResult> {
  const pipeline = sharp(buf).resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true });
  const stats = await pipeline.stats();
  const h = heuristicFromSharpStats(stats);
  return {
    version: 1,
    computedAt: new Date().toISOString(),
    brisqueApprox: h.brisqueApprox,
    sharpnessScore: h.sharpnessScore,
    vibrancyScore: h.vibrancyScore,
    contrastScore: h.contrastScore,
    foodWarmthHeuristic: h.foodWarmthHeuristic,
    overallHeuristic: h.overallHeuristic,
    notes: "Heuristic no-reference scores from viewport screenshot; not a substitute for human art direction.",
  };
}

export function designScoreNudgeFromVisual(metrics: AuditVisualIntelligenceResult): number {
  const o = metrics.overallHeuristic;
  if (o >= 76) return Math.min(8, Math.round((o - 72) * 0.2));
  if (o < 58) return Math.max(-8, Math.round((o - 62) * 0.25));
  return 0;
}
