/**
 * Read-only Zettle smoke test (no DB writes). Usage:
 *   ZETTLE_CLIENT_ID=<KOB app id> ZETTLE_SMOKE_API_KEY=<merchant API key> npx tsx scripts/smoke/zettle.ts
 */
import { ZETTLE_PRODUCT_BASE, ZETTLE_PURCHASE_BASE, zettleConnector } from "@/lib/connectors/zettle/connector";
import { zettleManifest } from "@/lib/connectors/zettle/manifest";
import { mapZettleProducts, mapZettlePurchase, type ZettleProduct, type ZettlePurchase } from "@/lib/connectors/zettle/map";
import { jwtBearerGrant } from "@/lib/hub/auth/jwt-bearer";
import { need, summarise } from "./_summary";

async function main() {
  const apiKey = need("ZETTLE_SMOKE_API_KEY");
  const check = await zettleConnector.validateCredentials({ apiKey });
  console.log("validateCredentials:", check.ok ? "ok" : check.error);
  if (!check.ok) process.exit(1);
  const { accessToken } = await jwtBearerGrant({ tokenUrl: zettleManifest.auth.tokenUrl!, clientId: need("ZETTLE_CLIENT_ID"), assertion: apiKey });
  const headers = { Authorization: `Bearer ${accessToken}` };
  const q = new URLSearchParams({ startDate: new Date(Date.now() - 30 * 86_400_000).toISOString(), limit: "1000", descending: "false" });
  const { purchases = [] } = (await (await fetch(`${ZETTLE_PURCHASE_BASE}/purchases/v2?${q}`, { headers })).json()) as { purchases?: ZettlePurchase[] };
  const products = (await (await fetch(`${ZETTLE_PRODUCT_BASE}/organizations/self/products/v2`, { headers })).json()) as ZettleProduct[];
  summarise("Zettle (last 30 days)", purchases.map(mapZettlePurchase).filter((o) => o !== null), mapZettleProducts(products));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
