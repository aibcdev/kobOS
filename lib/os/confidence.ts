export type WeightedEvidence = { weight: number; value: number };

/** C = Σ(wᵢ × evidenceᵢ) / Σ(wᵢ), evidence in [0,1] */
export function evidenceConfidence(parts: WeightedEvidence[]): number {
  let num = 0;
  let den = 0;
  for (const p of parts) {
    const w = Number.isFinite(p.weight) ? p.weight : 0;
    const v = Math.min(1, Math.max(0, Number.isFinite(p.value) ? p.value : 0));
    num += w * v;
    den += w;
  }
  return den === 0 ? 0 : num / den;
}

export function wasteRecognitionConfidence(input: {
  vision: number;
  weightConsistency: number;
  menuContext: number;
  posContext: number;
  timeStation: number;
  historical: number;
}): number {
  return evidenceConfidence([
    { weight: 0.4, value: input.vision },
    { weight: 0.2, value: input.weightConsistency },
    { weight: 0.15, value: input.menuContext },
    { weight: 0.1, value: input.posContext },
    { weight: 0.1, value: input.timeStation },
    { weight: 0.05, value: input.historical },
  ]);
}

export function classifyByConfidence(c: number): "high" | "review" | "unknown" {
  if (c >= 0.9) return "high";
  if (c >= 0.7) return "review";
  return "unknown";
}
