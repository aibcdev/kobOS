/** Net usable = gross × yield % */
export function netUsable(gross: number, yieldPct: number): number {
  return gross * yieldPct;
}

export function ingredientRecipeCost(netRequired: number, costPerUsable: number): number {
  return netRequired * costPerUsable;
}

export function baseUnitCost(lineTotal: number, deliveredBaseUnits: number): number {
  if (deliveredBaseUnits === 0) return 0;
  return lineTotal / deliveredBaseUnits;
}

export function usableUnitCost(purchaseCost: number, purchasedQty: number, yieldPct: number): number {
  const usable = purchasedQty * yieldPct;
  if (usable === 0) return 0;
  return purchaseCost / usable;
}

export function landedCost(input: {
  productCost: number;
  deliveryCharge: number;
  surcharges: number;
  expectedWasteCost: number;
  rebates: number;
}): number {
  return (
    input.productCost +
    input.deliveryCharge +
    input.surcharges +
    input.expectedWasteCost -
    input.rebates
  );
}

export function effectiveUsableCost(landed: number, usableQty: number): number {
  if (usableQty === 0) return 0;
  return landed / usableQty;
}

export type SupplierScoreWeights = {
  price: number;
  quality: number;
  reliability: number;
  delivery: number;
  terms: number;
  sustainability: number;
  preference: number;
};

export const DEFAULT_SUPPLIER_WEIGHTS: SupplierScoreWeights = {
  price: 0.35,
  quality: 0.25,
  reliability: 0.15,
  delivery: 0.1,
  terms: 0.05,
  sustainability: 0.05,
  preference: 0.05,
};

export function supplierScore(
  scores: Record<keyof SupplierScoreWeights, number>,
  weights: SupplierScoreWeights = DEFAULT_SUPPLIER_WEIGHTS,
): number {
  return (
    scores.price * weights.price +
    scores.quality * weights.quality +
    scores.reliability * weights.reliability +
    scores.delivery * weights.delivery +
    scores.terms * weights.terms +
    scores.sustainability * weights.sustainability +
    scores.preference * weights.preference
  );
}

export type Equivalence = {
  categoryMatch: boolean;
  specCompatible: boolean;
  allergyCompatible: boolean;
  qualityOk: boolean;
  packagingOk: boolean;
  deliveryOk: boolean;
};

export function isEquivalent(e: Equivalence): boolean {
  return (
    e.categoryMatch &&
    e.specCompatible &&
    e.allergyCompatible &&
    e.qualityOk &&
    e.packagingOk &&
    e.deliveryOk
  );
}

export function priceChangePct(current: number, baseline: number): number {
  if (baseline === 0) return 0;
  return (current - baseline) / baseline;
}

export function priceFlag(pct: number): "info" | "actionable" | "urgent" | "none" {
  const a = Math.abs(pct);
  if (a > 0.2) return "urgent";
  if (a > 0.1) return "actionable";
  if (a > 0.05) return "info";
  return "none";
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export function robustZ(current: number, history: number[]): number | null {
  if (history.length < 5) return null;
  const med = median(history);
  const mad = median(history.map((p) => Math.abs(p - med)));
  if (mad === 0) return 0;
  return (0.6745 * (current - med)) / mad;
}

export function robustAnomaly(current: number, history: number[]): boolean {
  const z = robustZ(current, history);
  if (z == null) return false;
  return Math.abs(z) > 3.5;
}

export function verifiedSavings(oldNorm: number, newNorm: number, qty: number, switching: number): number {
  return oldNorm * qty - newNorm * qty - switching;
}
