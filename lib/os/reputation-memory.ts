export function mayAutoReply(input: {
  rating: number;
  complaintSeverity: number;
  confidence: number;
  autopilot: boolean;
}): boolean {
  return input.rating >= 4 && input.complaintSeverity < 0.3 && input.confidence > 0.9 && input.autopilot;
}

export function topicSpike(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? Infinity : 0;
  return current / previous;
}

export type CandidateRule = {
  scope: string;
  ruleType: string;
  conditionJson: Record<string, unknown>;
  actionJson: Record<string, unknown>;
};

export function parseNeverDiscountFriday(utterance: string): CandidateRule | null {
  const t = utterance.toLowerCase();
  if (!/never discount friday|don't ever discount friday|do not discount friday/.test(t)) return null;
  return {
    scope: "marketing",
    ruleType: "discount",
    conditionJson: { day_of_week: ["FRIDAY"] },
    actionJson: { prohibited: true },
  };
}

export function parseNeverSwitchCoffee(utterance: string): CandidateRule | null {
  const t = utterance.toLowerCase();
  if (!t.includes("coffee")) return null;
  if (!/(never|don't ever|do not|dont ever)/.test(t)) return null;
  if (!/(switch|substitut|price)/.test(t)) return null;
  return {
    scope: "procurement",
    ruleType: "supplier_change",
    conditionJson: { ingredient: "coffee" },
    actionJson: { require_owner_approval: true, substitution_policy: "NEVER" },
  };
}

export function coffeeSwitchAllowed(rules: CandidateRule[]): boolean {
  return !rules.some(
    (r) =>
      r.ruleType === "supplier_change" &&
      (r.conditionJson.ingredient === "coffee" || r.actionJson.substitution_policy === "NEVER"),
  );
}
