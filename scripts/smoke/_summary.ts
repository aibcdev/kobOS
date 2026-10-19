import type { CatalogItemInput, OrderInput } from "@/lib/commerce/ingest";
import { formatMinor } from "@/lib/commerce/money";

/** Prints counts and totals only: no names, emails, phones or ids beyond the first order's short id. */
export function summarise(provider: string, orders: OrderInput[], catalog: CatalogItemInput[] = []): void {
  const byStatus = orders.reduce<Record<string, number>>((m, o) => ({ ...m, [o.status]: (m[o.status] ?? 0) + 1 }), {});
  const currency = orders[0]?.currency ?? "GBP";
  const revenue = orders.filter((o) => o.status === "COMPLETED" || o.status === "REFUNDED").reduce((s, o) => s + o.totalMinor - (o.refundedMinor ?? 0), 0);
  console.log(`${provider}: ${orders.length} orders ${JSON.stringify(byStatus)}, net ${formatMinor(revenue, currency)}`);
  console.log(`  with guest identities: ${orders.filter((o) => o.guest?.identities.length).length}, lines: ${orders.reduce((s, o) => s + (o.lines?.length ?? 0), 0)}`);
  if (catalog.length) console.log(`  catalog items: ${catalog.length} (${catalog.filter((c) => c.priceMinor != null).length} priced)`);
}

export function need(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Set ${name} (see the header of this script).`);
    process.exit(1);
  }
  return v;
}
