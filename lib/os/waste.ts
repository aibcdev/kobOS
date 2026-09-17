export type MeasurementMethod =
  | "SCALE_VISION"
  | "SCALE_ONLY"
  | "MANUAL_WEIGHT"
  | "THIRD_PARTY_SYNC"
  | "ESTIMATE";

export function countsAsMeasured(method: MeasurementMethod): boolean {
  return method !== "ESTIMATE";
}

export function wasteEventCost(netWeight: number, usableCost: number): number {
  return netWeight * usableCost;
}

export function wastePer100Covers(measuredCost: number, covers: number): number {
  if (covers === 0) return 0;
  return (measuredCost / covers) * 100;
}

export function wasteReductionPct(baselineRate: number, currentRate: number): number | null {
  if (baselineRate === 0) return null;
  return ((baselineRate - currentRate) / baselineRate) * 100;
}

export function wasteClaimAllowed(input: {
  method: MeasurementMethod;
  baselineDays: number;
  currentDays: number;
  methodsComparable: boolean;
  coversOk: boolean;
}): boolean {
  if (!countsAsMeasured(input.method)) return false;
  if (!input.methodsComparable) return false;
  if (!input.coversOk) return false;
  if (input.baselineDays < 14 || input.currentDays < 14) return false;
  return true;
}

export function silenceMeansZeroWaste(opts: {
  restaurantOpen: boolean;
  lastEventAgeMs: number;
  expectedMaxSilenceMs: number;
  sensorHealthy: boolean;
}): boolean {
  if (!opts.restaurantOpen) return false;
  if (!opts.sensorHealthy) return false;
  if (opts.lastEventAgeMs > opts.expectedMaxSilenceMs) return false;
  return true;
}
