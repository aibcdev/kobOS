/**
 * Read-only Square smoke test (no DB writes). Usage:
 *   SQUARE_ENV=sandbox SQUARE_SMOKE_TOKEN=<sandbox access token> npx tsx scripts/smoke/square.ts
 */
import { squareBase, squareConnector } from "@/lib/connectors/square/connector";
import { mapSquareCatalog, mapSquareOrder, type SquareCatalogObject, type SquareOrder } from "@/lib/connectors/square/map";
import { need, summarise } from "./_summary";

async function main() {
  const token = need("SQUARE_SMOKE_TOKEN");
  const check = await squareConnector.validateCredentials({ accessToken: token });
  console.log("validateCredentials:", check.ok ? "ok" : check.error);
  if (!check.ok) process.exit(1);
  const headers = { Authorization: `Bearer ${token}`, "Square-Version": "2025-01-23", "Content-Type": "application/json" };
  const ctx = { restaurantId: "smoke", integrationId: "smoke", getAccessToken: async () => token };
  const locations = await squareConnector.listLocations!(ctx);
  console.log(`locations: ${locations.length}`);
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const res = await fetch(`${squareBase()}/v2/orders/search`, {
    method: "POST",
    headers,
    body: JSON.stringify({ location_ids: locations.map((l) => l.externalId).slice(0, 10), limit: 100, query: { filter: { date_time_filter: { updated_at: { start_at: since } } } } }),
  });
  const { orders = [] } = (await res.json()) as { orders?: SquareOrder[] };
  const cat = (await (await fetch(`${squareBase()}/v2/catalog/list?types=ITEM`, { headers })).json()) as { objects?: SquareCatalogObject[] };
  summarise("Square (last 30 days, first page)", orders.map(mapSquareOrder).filter((o) => o !== null), mapSquareCatalog(cat.objects ?? [], new Map()));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
