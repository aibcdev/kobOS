/**
 * Read-only Epos Now smoke test (no DB writes). Usage:
 *   EPOS_NOW_SMOKE_KEY=… EPOS_NOW_SMOKE_SECRET=… [EPOS_NOW_SMOKE_TZ=Europe/London] npx tsx scripts/smoke/epos-now.ts
 */
import { eposBase, eposNowConnector } from "@/lib/connectors/epos-now/connector";
import { mapEposProducts, mapEposTransaction, type EposProduct, type EposTransaction } from "@/lib/connectors/epos-now/map";
import { utcToZoned } from "@/lib/connectors/shared";
import { basicAuth } from "@/lib/hub/auth/oauth2";
import { need, summarise } from "./_summary";

async function main() {
  const creds = { apiKey: need("EPOS_NOW_SMOKE_KEY"), apiSecret: need("EPOS_NOW_SMOKE_SECRET") };
  const check = await eposNowConnector.validateCredentials(creds);
  console.log("validateCredentials:", check.ok ? "ok" : check.error);
  if (!check.ok) process.exit(1);
  const headers = { Authorization: basicAuth(creds.apiKey, creds.apiSecret) };
  const timezone = process.env.EPOS_NOW_SMOKE_TZ ?? "Europe/London";
  const day = utcToZoned(new Date(Date.now() - 86_400_000), timezone).slice(0, 10);
  const txns = (await (await fetch(`${eposBase()}/api/v4/Transaction/GetByDate?startDate=${day}&endDate=${day}&page=1`, { headers })).json()) as EposTransaction[];
  const products = (await (await fetch(`${eposBase()}/api/v4/Product?page=1`, { headers })).json()) as EposProduct[];
  const catalog = mapEposProducts(products, new Map(), "GBP");
  const productNames = new Map(catalog.map((c) => [c.externalId, c.name]));
  summarise(`Epos Now (${day})`, txns.map((t) => mapEposTransaction(t, { timezone, currency: "GBP", productNames })).filter((o) => o !== null), catalog);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
