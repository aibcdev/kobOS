import { ingestGuests, ingestOrders, upsertCatalog } from "@/lib/commerce/ingest";
import { ConnectorError } from "@/lib/connectors/errors";
import { incrementalPage, providerJson, readCursor } from "@/lib/connectors/shared";
import { squareManifest } from "@/lib/connectors/square/manifest";
import {
  mapSquareCatalog,
  mapSquareCustomer,
  mapSquareOrder,
  type SquareCatalogObject,
  type SquareCustomer,
  type SquareOrder,
} from "@/lib/connectors/square/map";
import type { Connector, ConnectorCtx, ConnectorEventRow, ExternalLocation, SyncPage } from "@/lib/hub/connector";
import { requireLocationChoice, saveLocationChoice } from "@/lib/hub/locations";

const SQUARE_VERSION = "2025-01-23";

export function squareBase(): string {
  return process.env.SQUARE_ENV === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com";
}

async function call<T>(ctx: ConnectorCtx, path: string, body?: unknown, token?: string): Promise<T> {
  const accessToken = token ?? (await ctx.getAccessToken());
  return providerJson<T>(ctx, "Square", `${squareBase()}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Square-Version": SQUARE_VERSION,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

type LocationsRes = { locations?: { id: string; name?: string; status?: string; timezone?: string; currency?: string; address?: { address_line_1?: string; locality?: string; postal_code?: string } }[] };

async function listLocations(ctx: ConnectorCtx): Promise<ExternalLocation[]> {
  const res = await call<LocationsRes>(ctx, "/v2/locations");
  return (res.locations ?? [])
    .filter((l) => l.status !== "INACTIVE")
    .map((l) => ({
      externalId: l.id,
      name: l.name ?? l.id,
      address: [l.address?.address_line_1, l.address?.locality, l.address?.postal_code].filter(Boolean).join(", ") || undefined,
      timezone: l.timezone,
      currency: l.currency,
    }));
}

const backfillDays = (stream: string) => squareManifest.streams.find((s) => s.name === stream)?.backfillDays ?? 1;

/** The owner's pick; a single-location merchant is picked automatically; several with no pick pauses the sync. */
async function orderLocations(ctx: ConnectorCtx): Promise<string[] | "needs_choice"> {
  if (ctx.locationIds?.length) return ctx.locationIds;
  const all = await listLocations(ctx);
  if (all.length > 1) return "needs_choice";
  if (all.length === 1) await saveLocationChoice(ctx.integrationId, [all[0].externalId]);
  return all.map((l) => l.externalId);
}

async function syncOrders(ctx: ConnectorCtx, raw: string | null): Promise<SyncPage> {
  const c = readCursor(raw, backfillDays("orders"), ctx.now?.() ?? new Date());
  const locationIds = await orderLocations(ctx);
  if (locationIds === "needs_choice") {
    await requireLocationChoice(ctx.integrationId);
    return { rows: 0, nextCursor: raw, done: true };
  }
  if (!locationIds.length) return { rows: 0, nextCursor: JSON.stringify({ since: c.since }), done: true };
  const res = await call<{ orders?: SquareOrder[]; cursor?: string }>(ctx, "/v2/orders/search", {
    location_ids: locationIds,
    limit: 100,
    ...(c.page ? { cursor: c.page } : {}),
    query: {
      filter: { date_time_filter: { updated_at: { start_at: c.since } } },
      sort: { sort_field: "UPDATED_AT", sort_order: "ASC" },
    },
  });
  const orders = res.orders ?? [];
  const mapped = orders.map(mapSquareOrder).filter((o): o is NonNullable<typeof o> => o !== null);
  if (mapped.length) await ingestOrders(ctx.restaurantId, mapped);
  const maxSeen = orders.reduce<string | null>((m, o) => (o.updated_at && (!m || o.updated_at > m) ? o.updated_at : m), null);
  return incrementalPage(c, mapped.length, res.cursor ?? null, maxSeen);
}

/** FULL stream: the cursor is Square's page token; null when the catalog has been read to the end. */
async function syncCatalog(ctx: ConnectorCtx, page: string | null): Promise<SyncPage> {
  const q = new URLSearchParams({ types: "ITEM,CATEGORY" });
  if (page) q.set("cursor", page);
  const res = await call<{ objects?: SquareCatalogObject[]; cursor?: string }>(ctx, `/v2/catalog/list?${q}`);
  const objects = res.objects ?? [];
  const categories = new Map(objects.filter((o) => o.type === "CATEGORY").map((o) => [o.id, o.category_data?.name ?? ""]));
  const items = mapSquareCatalog(objects, categories);
  await upsertCatalog(ctx.restaurantId, "SQUARE", items, ctx.now?.());
  return { rows: items.length, nextCursor: res.cursor ?? null, done: !res.cursor };
}

async function syncCustomers(ctx: ConnectorCtx, raw: string | null): Promise<SyncPage> {
  const c = readCursor(raw, backfillDays("customers") || 3650, ctx.now?.() ?? new Date());
  const res = await call<{ customers?: SquareCustomer[]; cursor?: string }>(ctx, "/v2/customers/search", {
    limit: 100,
    ...(c.page ? { cursor: c.page } : {}),
    query: { filter: { updated_at: { start_at: c.since } }, sort: { field: "CREATED_AT", order: "ASC" } },
  });
  const customers = res.customers ?? [];
  await ingestGuests(ctx.restaurantId, customers.map(mapSquareCustomer));
  const maxSeen = customers.reduce<string | null>((m, x) => (x.updated_at && (!m || x.updated_at > m) ? x.updated_at : m), null);
  return incrementalPage(c, customers.length, res.cursor ?? null, maxSeen);
}

type SquareWebhook = {
  type?: string;
  data?: { id?: string; object?: { order_updated?: { order_id?: string }; order_created?: { order_id?: string }; customer?: SquareCustomer } };
};

async function handleWebhook(ctx: ConnectorCtx, event: ConnectorEventRow): Promise<void> {
  const body = event.payloadJson as SquareWebhook;
  if (event.type === "order.created" || event.type === "order.updated") {
    const id = body.data?.object?.order_updated?.order_id ?? body.data?.object?.order_created?.order_id ?? body.data?.id;
    if (!id) return;
    // Other venues on the same merchant account aren't this restaurant's sales.
    if (!ctx.locationIds?.length) return;
    const res = await call<{ order?: SquareOrder }>(ctx, `/v2/orders/${encodeURIComponent(id)}`);
    if (!res.order?.location_id || !ctx.locationIds.includes(res.order.location_id)) return;
    const mapped = mapSquareOrder(res.order);
    if (mapped) await ingestOrders(ctx.restaurantId, [mapped]);
    return;
  }
  if (event.type === "customer.created" || event.type === "customer.updated") {
    // Webhook payloads are PII-minimised; re-read the customer so the raw email/phone can be encrypted.
    const id = body.data?.object?.customer?.id ?? body.data?.id;
    if (!id) return;
    const res = await call<{ customer?: SquareCustomer }>(ctx, `/v2/customers/${encodeURIComponent(id)}`);
    if (res.customer) await ingestGuests(ctx.restaurantId, [mapSquareCustomer(res.customer)]);
  }
  // catalog.version.updated: the nightly FULL catalog stream picks it up.
}

export const squareConnector: Connector = {
  manifest: squareManifest,
  async validateCredentials(input, ctx) {
    if (!input.accessToken) return { ok: false, error: "Missing access token" };
    try {
      const res = await call<{ merchant?: { id: string } }>({ fetch: ctx?.fetch } as ConnectorCtx, "/v2/merchants/me", undefined, input.accessToken);
      return { ok: true, externalAccountId: res.merchant?.id };
    } catch (e) {
      return { ok: false, error: e instanceof ConnectorError ? e.message : "Square check failed" };
    }
  },
  listLocations,
  async sync(ctx, stream, cursor) {
    if (stream === "orders") return syncOrders(ctx, cursor);
    if (stream === "catalog") return syncCatalog(ctx, cursor);
    if (stream === "customers") return syncCustomers(ctx, cursor);
    throw new ConnectorError("VALIDATION", `Square has no stream ${stream}`);
  },
  handleWebhook,
};
