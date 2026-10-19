import { ingestOrders, upsertCatalog } from "@/lib/commerce/ingest";
import { ConnectorError } from "@/lib/connectors/errors";
import { incrementalPage, providerJson, readCursor } from "@/lib/connectors/shared";
import { zettleManifest } from "@/lib/connectors/zettle/manifest";
import { mapZettleProducts, mapZettlePurchase, type ZettleProduct, type ZettlePurchase } from "@/lib/connectors/zettle/map";
import { jwtBearerGrant } from "@/lib/hub/auth/jwt-bearer";
import type { Connector, ConnectorCtx, SyncPage } from "@/lib/hub/connector";

const LIMIT = 1000;

export const ZETTLE_PURCHASE_BASE = "https://purchase.izettle.com";
export const ZETTLE_PRODUCT_BASE = "https://products.izettle.com";

async function call<T>(ctx: ConnectorCtx, url: string): Promise<T> {
  const token = await ctx.getAccessToken();
  return providerJson<T>(ctx, "Zettle", url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
}

/** Purchases oldest-first from the watermark; Zettle pages with `lastPurchaseHash`. */
async function syncOrders(ctx: ConnectorCtx, raw: string | null): Promise<SyncPage> {
  const c = readCursor(raw, zettleManifest.streams[0].backfillDays, ctx.now?.() ?? new Date());
  const q = new URLSearchParams({ startDate: c.since, limit: String(LIMIT), descending: "false" });
  if (c.page) q.set("lastPurchaseHash", c.page);
  const res = await call<{ purchases?: ZettlePurchase[]; lastPurchaseHash?: string }>(ctx, `${ZETTLE_PURCHASE_BASE}/purchases/v2?${q}`);
  const purchases = res.purchases ?? [];
  const mapped = purchases.map(mapZettlePurchase).filter((o): o is NonNullable<typeof o> => o !== null);
  if (mapped.length) await ingestOrders(ctx.restaurantId, mapped);
  const maxSeen = purchases.reduce<string | null>((m, p) => (p.timestamp && (!m || p.timestamp > m) ? p.timestamp : m), null);
  const more = purchases.length >= LIMIT && res.lastPurchaseHash ? res.lastPurchaseHash : null;
  return incrementalPage(c, mapped.length, more, maxSeen);
}

async function syncCatalog(ctx: ConnectorCtx): Promise<SyncPage> {
  const products = await call<ZettleProduct[]>(ctx, `${ZETTLE_PRODUCT_BASE}/organizations/self/products/v2`);
  const items = mapZettleProducts(Array.isArray(products) ? products : []);
  await upsertCatalog(ctx.restaurantId, "ZETTLE", items, ctx.now?.());
  return { rows: items.length, nextCursor: null, done: true };
}

export const zettleConnector: Connector = {
  manifest: zettleManifest,
  async validateCredentials(input, ctx) {
    const clientId = process.env.ZETTLE_CLIENT_ID;
    if (!input.apiKey) return { ok: false, error: "API key is required" };
    if (!clientId) return { ok: false, error: "Zettle isn't configured yet" };
    try {
      await jwtBearerGrant({ tokenUrl: zettleManifest.auth.tokenUrl!, clientId, assertion: input.apiKey, fetch: ctx?.fetch });
      return { ok: true };
    } catch {
      return { ok: false, error: "Zettle rejected that API key" };
    }
  },
  async sync(ctx, stream, cursor) {
    if (stream === "orders") return syncOrders(ctx, cursor);
    if (stream === "catalog") return syncCatalog(ctx);
    throw new ConnectorError("VALIDATION", `Zettle has no stream ${stream}`);
  },
};
