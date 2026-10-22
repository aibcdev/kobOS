/**
 * Read-only Clover smoke test (no DB writes). Usage:
 *   CLOVER_SMOKE_TOKEN=<merchant access token> CLOVER_SMOKE_MERCHANT=<merchant id> [CLOVER_REGION=NA|EU|LA] [CLOVER_ENV=sandbox] \
 *   npx tsx scripts/smoke/clover.ts
 */
import { cloverApiBase, cloverConnector } from "@/lib/connectors/clover/connector";
import { mapCloverItems, mapCloverOrder, type CloverItem, type CloverOrder } from "@/lib/connectors/clover/map";
import { need, summarise } from "./_summary";

async function main() {
  const token = need("CLOVER_SMOKE_TOKEN");
  const merchantId = need("CLOVER_SMOKE_MERCHANT");
  const region = process.env.CLOVER_REGION ?? "NA";
  const check = await cloverConnector.validateCredentials({ accessToken: token, merchantId, region });
  console.log("validateCredentials:", check.ok ? "ok" : check.error);
  if (!check.ok) process.exit(1);
  const base = `${cloverApiBase(region)}/v3/merchants/${merchantId}`;
  const headers = { Authorization: `Bearer ${token}` };
  const q = new URLSearchParams({ expand: "lineItems,payments,refunds,customers,orderType", limit: "100" });
  q.append("filter", `modifiedTime>=${Date.now() - 30 * 86_400_000}`);
  const { elements: orders = [] } = (await (await fetch(`${base}/orders?${q}`, { headers })).json()) as { elements?: CloverOrder[] };
  const { elements: items = [] } = (await (await fetch(`${base}/items?expand=categories&limit=1000`, { headers })).json()) as { elements?: CloverItem[] };
  const currency = orders[0]?.currency ?? "USD";
  summarise("Clover (last 30 days, first 100)", orders.map((o) => mapCloverOrder(o, currency)).filter((o) => o !== null), mapCloverItems(items, currency));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
