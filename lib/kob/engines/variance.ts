import {
  HOUSE_RATES,
  OPENING_STOCK_G,
  RECIPES,
  type InvoiceLine,
  type PosSale,
  keyItem,
} from "@/lib/kob/engines/kitchen-data";

export type VarianceRow = {
  ingredient: string
  openingG: number
  invoicedG: number
  theoreticalG: number
  varianceG: number
  houseRatePerKg: number
  lostGbp: number
};

export function runVariance(invoices: InvoiceLine[], sales: PosSale[]): VarianceRow[] {
  const invoiced = new Map<string, number>();
  for (const line of invoices) {
    const key = keyItem(line.item);
    invoiced.set(key, (invoiced.get(key) ?? 0) + line.grams);
  }

  const theoretical = new Map<string, number>();
  for (const sale of sales) {
    for (const recipe of RECIPES.filter((r) => r.dish === sale.dish)) {
      theoretical.set(
        recipe.ingredient,
        (theoretical.get(recipe.ingredient) ?? 0) +
          sale.portions * recipe.gramsPerPortion,
      );
    }
  }

  const keys = new Set([
    ...Object.keys(OPENING_STOCK_G),
    ...invoiced.keys(),
    ...theoretical.keys(),
  ]);

  return [...keys].map((ingredient) => {
    const openingG = OPENING_STOCK_G[ingredient] ?? 0;
    const invoicedG = invoiced.get(ingredient) ?? 0;
    const theoreticalG = theoretical.get(ingredient) ?? 0;
    const varianceG = openingG + invoicedG - theoreticalG;
    const houseRatePerKg = HOUSE_RATES[ingredient] ?? 0;
    const lostGbp =
      varianceG > 0 ? (varianceG / 1000) * houseRatePerKg : 0;
    return {
      ingredient,
      openingG,
      invoicedG,
      theoreticalG,
      varianceG,
      houseRatePerKg,
      lostGbp: Math.round(lostGbp * 100) / 100,
    };
  });
}

export function leakageCopy(rows: VarianceRow[]) {
  const hot = [...rows].sort((a, b) => b.lostGbp - a.lostGbp)[0];
  if (!hot || hot.lostGbp <= 0) {
    return "Invoices and POS line up tonight. No leakage to flag.";
  }
  const kg = (hot.varianceG / 1000).toFixed(1);
  return `You bought ${kg}kg of ${hot.ingredient} that did not leave as dishes (opening + invoices minus recipe theory). About £${hot.lostGbp.toFixed(0)} at the house rate. Check over-portioning or waste. I can text the kitchen — or leave it.`;
}
