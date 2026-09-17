export type RiskParts = {
  financial: number;
  customer: number;
  reversibility: number;
  reputation: number;
  operational: number;
};

export function clamp100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

export function actionRisk(p: RiskParts): number {
  return (
    clamp100(p.financial) * 0.3 +
    clamp100(p.customer) * 0.25 +
    clamp100(p.reversibility) * 0.15 +
    clamp100(p.reputation) * 0.15 +
    clamp100(p.operational) * 0.15
  );
}

export function riskRequiresApproval(risk: number, mode: string): boolean {
  if (mode === "NEVER") return true;
  if (risk >= 76) return true;
  if (mode === "ASK") return true;
  if (risk >= 51 && mode !== "AUTOPILOT") return true;
  if (risk >= 21 && mode === "AUTO_WITH_LIMITS") return false;
  return mode !== "AUTOPILOT" && mode !== "AUTO_WITH_LIMITS";
}
