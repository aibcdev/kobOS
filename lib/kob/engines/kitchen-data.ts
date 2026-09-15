export type InvoiceLine = {
  item: string
  qty: number
  unit: string
  unitPrice: number
  grams: number
  currency: "GBP"
};

export type Recipe = {
  dish: string
  ingredient: string
  gramsPerPortion: number
};

export type PosSale = {
  dish: string
  portions: number
};

export const RECIPES: Recipe[] = [
  { dish: "Avocado salad", ingredient: "avocado", gramsPerPortion: 80 },
  { dish: "Soup of the day", ingredient: "soup_base", gramsPerPortion: 280 },
  { dish: "Salmon fillet", ingredient: "salmon", gramsPerPortion: 160 },
  { dish: "Cheddar toastie", ingredient: "cheddar", gramsPerPortion: 40 },
];

export const HOUSE_RATES: Record<string, number> = {
  cheddar: 7.5,
  salmon: 18,
  avocado: 4.2,
  milk: 0.95,
};

export const OPENING_STOCK_G: Record<string, number> = {
  cheddar: 2000,
  salmon: 8000,
  avocado: 3000,
  milk: 10000,
  soup_base: 5000,
};

/** Demo POS pull — labelled as demo until a file is uploaded. */
export const DEMO_POS: PosSale[] = [
  { dish: "Avocado salad", portions: 22 },
  { dish: "Soup of the day", portions: 18 },
  { dish: "Salmon fillet", portions: 38 },
  { dish: "Cheddar toastie", portions: 40 },
];

export const DEMO_INVOICE_LINES: InvoiceLine[] = [
  {
    item: "cheddar",
    qty: 5,
    unit: "kg",
    unitPrice: 9.2,
    grams: 5000,
    currency: "GBP",
  },
  {
    item: "salmon",
    qty: 20,
    unit: "kg",
    unitPrice: 18,
    grams: 20000,
    currency: "GBP",
  },
  {
    item: "milk",
    qty: 12,
    unit: "l",
    unitPrice: 1.2,
    grams: 12000,
    currency: "GBP",
  },
];

export const SALES_MIX = {
  coldC: 15,
  saladDrop: 0.4,
  soupRise: 0.6,
};

export function gramsFromUnit(qty: number, unit: string) {
  const u = unit.toLowerCase();
  if (u.startsWith("kg") || u === "kilo") return qty * 1000;
  if (u.startsWith("l") || u.includes("litre")) return qty * 1000;
  if (u.startsWith("g")) return qty;
  if (u.includes("case")) return qty * 12 * 1000;
  return qty * 1000;
}

export function keyItem(name: string) {
  const n = name.toLowerCase();
  if (n.includes("cheddar") || n.includes("cheese")) return "cheddar";
  if (n.includes("salmon")) return "salmon";
  if (n.includes("avocado")) return "avocado";
  if (n.includes("milk")) return "milk";
  if (n.includes("soup")) return "soup_base";
  return n.replace(/[^a-z0-9]+/g, "_").slice(0, 24);
}
