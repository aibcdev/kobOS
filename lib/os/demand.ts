export function expectedSales(input: {
  baseline: number;
  dayFactor: number;
  weatherFactor: number;
  reservationFactor: number;
  eventFactor: number;
  promotionFactor: number;
  seasonalityFactor: number;
}): number {
  return (
    input.baseline *
    input.dayFactor *
    input.weatherFactor *
    input.reservationFactor *
    input.eventFactor *
    input.promotionFactor *
    input.seasonalityFactor
  );
}

export function prepQty(input: {
  forecastDemand: number;
  portionQty: number;
  safetyBufferPct: number;
  yieldPct: number;
}): number {
  const safety = 1 + input.safetyBufferPct;
  if (input.yieldPct === 0) return 0;
  return (input.forecastDemand * input.portionQty * safety) / input.yieldPct;
}

export function recommendedPrep(input: {
  expectedConsumption: number;
  safetyStock: number;
  usableOnHand: number;
  expectedCarryover: number;
}): number {
  return Math.max(0, input.expectedConsumption + input.safetyStock - input.usableOnHand - input.expectedCarryover);
}

export function wasteCost(excess: number, ingredientCost: number): number {
  return excess * ingredientCost;
}

export function stockoutCost(
  unmet: number,
  contributionMargin: number,
  penalty: number,
): number {
  return unmet * contributionMargin * penalty;
}

export function totalExpectedCost(q: number, opts: {
  expectedExcess: (q: number) => number;
  expectedUnmet: (q: number) => number;
  ingredientCost: number;
  contributionMargin: number;
  stockoutPenalty: number;
}): number {
  return (
    wasteCost(opts.expectedExcess(q), opts.ingredientCost) +
    stockoutCost(opts.expectedUnmet(q), opts.contributionMargin, opts.stockoutPenalty)
  );
}

export function argminPrep(qs: number[], opts: Parameters<typeof totalExpectedCost>[1]): number {
  let best = qs[0] ?? 0;
  let bestC = Number.POSITIVE_INFINITY;
  for (const q of qs) {
    const c = totalExpectedCost(q, opts);
    if (c < bestC) {
      bestC = c;
      best = q;
    }
  }
  return best;
}

export function mape(actuals: number[], forecasts: number[], eps = 1e-6): number {
  const n = Math.min(actuals.length, forecasts.length);
  if (n === 0) return 0;
  let s = 0;
  for (let i = 0; i < n; i++) {
    s += Math.abs(actuals[i]! - forecasts[i]!) / Math.max(actuals[i]!, eps);
  }
  return (s / n) * 100;
}

export function wape(actuals: number[], forecasts: number[]): number {
  const n = Math.min(actuals.length, forecasts.length);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += Math.abs(actuals[i]! - forecasts[i]!);
    den += actuals[i]!;
  }
  if (den === 0) return 0;
  return num / den;
}
