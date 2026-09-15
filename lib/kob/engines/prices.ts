import { HOUSE_RATES, type InvoiceLine, keyItem } from "@/lib/kob/engines/kitchen-data";

export type PriceAlert = {
  item: string
  paid: number
  house: number
  abovePct: number
  note: string
};

const seen: { item: string; unitPrice: number }[] = [];

export function ingestPrices(lines: InvoiceLine[]) {
  for (const line of lines) {
    seen.push({ item: keyItem(line.item), unitPrice: line.unitPrice });
  }
}

export function priceAlerts(lines: InvoiceLine[]): PriceAlert[] {
  const alerts: PriceAlert[] = [];
  for (const line of lines) {
    const item = keyItem(line.item);
    const house = HOUSE_RATES[item];
    const peers = [
      ...seen.filter((s) => s.item === item).map((s) => s.unitPrice),
      line.unitPrice,
    ];
    const avg = peers.reduce((a, b) => a + b, 0) / peers.length;
    const bench = house ?? avg;
    if (!bench || line.unitPrice <= bench * 1.08) continue;
    const abovePct = Math.round(((line.unitPrice - bench) / bench) * 100);
    alerts.push({
      item,
      paid: line.unitPrice,
      house: bench,
      abovePct,
      note: `You paid £${line.unitPrice.toFixed(2)} for ${item}. The house / seen average is £${bench.toFixed(2)}. ${abovePct}% above. I can draft a note to the supplier — or leave it.`,
    });
  }
  return alerts;
}
