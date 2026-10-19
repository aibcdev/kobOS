import { ingestGuests, ingestOrders, upsertCatalog } from "@/lib/commerce/ingest";
import { rebuildSalesSnapshots } from "@/lib/commerce/sales-snapshot";
import { cloverManifest } from "@/lib/connectors/clover/manifest";
import { mapCloverCustomer, mapCloverItems, mapCloverOrder, type CloverCustomer, type CloverItem, type CloverOrder } from "@/lib/connectors/clover/map";
import { ConnectorError } from "@/lib/connectors/errors";
import { incrementalPage, providerJson, readCursor, restaurantContext } from "@/lib/connectors/shared";
import { prisma } from "@/lib/db/prisma";
import { sandboxActive } from "@/lib/hub/auth/oauth-urls";
import type { Connector, ConnectorCtx, ConnectorEventRow, ExternalLocation, SyncPage } from "@/lib/hub/connector";

const API_BASE: Record<string, string> = {
  NA: "https://api.clover.com",
  EU: "https://api.eu.clover.com",
  LA: "https://api.la.clover.com",
};

export function cloverApiBase(region: string | null | undefined): string {
  if (sandboxActive(cloverManifest)) return "https://apisandbox.dev.clover.com";
  return API_BASE[region ?? "NA"] ?? API_BASE.NA;
}

const ORDER_EXPAND = "lineItems,lineItems.modifications,payments,refunds,customers,orderType";
const PAGE = 100;
const CATALOG_PAGE = 1000;

function merchantOf(ctx: Pick<ConnectorCtx, "externalAccountId">): string {
  if (!ctx.externalAccountId) throw new ConnectorError("VALIDATION", "Clover merchant id missing; reconnect Clover");
  return ctx.externalAccountId;
}

async function call<T>(ctx: ConnectorCtx, path: string, query?: URLSearchParams, token?: string): Promise<T> {
  const accessToken = token ?? (await ctx.getAccessToken());
  const url = `${cloverApiBase(ctx.region)}/v3/merchants/${encodeURIComponent(merchantOf(ctx))}${path}${query ? `?${query}` : ""}`;
  return providerJson<T>(ctx, "Clover", url, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } });
}

type Merchant = { id: string; name?: string; address?: { address1?: string; city?: string; zip?: string; country?: string } };

async function listLocations(ctx: ConnectorCtx): Promise<ExternalLocation[]> {
  const m = await call<Merchant>(ctx, "", new URLSearchParams({ expand: "address" }));
  const a = m.address;
  return [{ externalId: m.id, name: m.name ?? m.id, address: [a?.address1, a?.city, a?.zip].filter(Boolean).join(", ") || undefined }];
}

const backfillDays = () => cloverManifest.streams.find((s) => s.name === "orders")!.backfillDays;

/** Clover filters on epoch ms and pages by offset; the cursor keeps ISO watermarks like the other connectors. */
async function syncOrders(ctx: ConnectorCtx, raw: string | null): Promise<SyncPage> {
  const c = readCursor(raw, backfillDays(), ctx.now?.() ?? new Date());
  const offset = Number(c.page ?? 0) || 0;
  const q = new URLSearchParams({ expand: ORDER_EXPAND, limit: String(PAGE), offset: String(offset) });
  q.append("filter", `modifiedTime>=${Date.parse(c.since)}`);
  const res = await call<{ elements?: CloverOrder[] }>(ctx, "/orders", q);
  const orders = res.elements ?? [];
  const { currency } = await restaurantContext(ctx.restaurantId);
  const mapped = orders.map((o) => mapCloverOrder(o, currency)).filter((o): o is NonNullable<typeof o> => o !== null);
  if (mapped.length) await ingestOrders(ctx.restaurantId, mapped);
  const maxMs = orders.reduce((m, o) => Math.max(m, o.modifiedTime ?? 0), 0);
  return incrementalPage(c, mapped.length, orders.length === PAGE ? String(offset + PAGE) : null, maxMs ? new Date(maxMs).toISOString() : null);
}

/** FULL streams: the cursor is the next offset; null once a short page comes back. */
async function syncCatalog(ctx: ConnectorCtx, page: string | null): Promise<SyncPage> {
  const offset = Number(page ?? 0) || 0;
  const res = await call<{ elements?: CloverItem[] }>(ctx, "/items", new URLSearchParams({ expand: "categories", limit: String(CATALOG_PAGE), offset: String(offset) }));
  const items = res.elements ?? [];
  const { currency } = await restaurantContext(ctx.restaurantId);
  const mapped = mapCloverItems(items, currency);
  await upsertCatalog(ctx.restaurantId, "CLOVER", mapped, ctx.now?.());
  const more = items.length === CATALOG_PAGE;
  return { rows: mapped.length, nextCursor: more ? String(offset + CATALOG_PAGE) : null, done: !more };
}

async function syncCustomers(ctx: ConnectorCtx, page: string | null): Promise<SyncPage> {
  const offset = Number(page ?? 0) || 0;
  const res = await call<{ elements?: CloverCustomer[] }>(ctx, "/customers", new URLSearchParams({ expand: "emailAddresses,phoneNumbers", limit: String(PAGE), offset: String(offset) }));
  const customers = res.elements ?? [];
  await ingestGuests(ctx.restaurantId, customers.map(mapCloverCustomer));
  const more = customers.length === PAGE;
  return { rows: customers.length, nextCursor: more ? String(offset + PAGE) : null, done: !more };
}

/** Verifier events: type "O.UPDATE" / "C.CREATE" / "I.DELETE", payload {objectId: "O:<id>", type, ts}. */
async function handleWebhook(ctx: ConnectorCtx, event: ConnectorEventRow): Promise<void> {
  const body = event.payloadJson as { objectId?: string; type?: string };
  const [kind, id] = (body.objectId ?? "").split(":");
  if (!id) return;
  if (kind === "O") {
    if (body.type === "DELETE") return cancelOrder(ctx, id);
    let order: CloverOrder;
    try {
      order = await call<CloverOrder>(ctx, `/orders/${encodeURIComponent(id)}`, new URLSearchParams({ expand: ORDER_EXPAND }));
    } catch (e) {
      if (e instanceof ConnectorError && e.code === "NOT_FOUND") return cancelOrder(ctx, id);
      throw e;
    }
    const mapped = mapCloverOrder(order, (await restaurantContext(ctx.restaurantId)).currency);
    if (mapped) await ingestOrders(ctx.restaurantId, [mapped]);
    return;
  }
  if (kind === "C" && body.type !== "DELETE") {
    const customer = await call<CloverCustomer>(ctx, `/customers/${encodeURIComponent(id)}`, new URLSearchParams({ expand: "emailAddresses,phoneNumbers" }));
    await ingestGuests(ctx.restaurantId, [mapCloverCustomer(customer)]);
  }
  // Inventory changes: the nightly FULL catalog stream picks them up.
}

/** A deleted Clover order stops counting as a sale. */
async function cancelOrder(ctx: ConnectorCtx, id: string): Promise<void> {
  const where = { restaurantId: ctx.restaurantId, sourceProvider: "CLOVER", sourceExternalId: id };
  const existing = await prisma.order.findFirst({ where, select: { placedAt: true, status: true } });
  if (!existing || existing.status === "CANCELLED") return;
  await prisma.order.updateMany({ where, data: { status: "CANCELLED" } });
  await rebuildSalesSnapshots(ctx.restaurantId, existing.placedAt, existing.placedAt, ["CLOVER"]);
}

export const cloverConnector: Connector = {
  manifest: cloverManifest,
  async validateCredentials(input, ctx) {
    if (!input.accessToken || !input.merchantId) return { ok: false, error: "Missing access token or merchant id" };
    try {
      const m = await call<Merchant>(
        { fetch: ctx?.fetch, externalAccountId: input.merchantId, region: input.region ?? null } as ConnectorCtx,
        "",
        undefined,
        input.accessToken,
      );
      return { ok: true, externalAccountId: m.id };
    } catch (e) {
      return { ok: false, error: e instanceof ConnectorError ? e.message : "Clover check failed" };
    }
  },
  listLocations,
  async sync(ctx, stream, cursor) {
    if (stream === "orders") return syncOrders(ctx, cursor);
    if (stream === "catalog") return syncCatalog(ctx, cursor);
    if (stream === "customers") return syncCustomers(ctx, cursor);
    throw new ConnectorError("VALIDATION", `Clover has no stream ${stream}`);
  },
  handleWebhook,
};
