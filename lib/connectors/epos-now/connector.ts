import { ingestGuests, ingestOrders, upsertCatalog } from "@/lib/commerce/ingest";
import { ConnectorError } from "@/lib/connectors/errors";
import { eposNowManifest } from "@/lib/connectors/epos-now/manifest";
import {
  mapEposCustomer,
  mapEposProducts,
  mapEposTransaction,
  type EposCategory,
  type EposCustomer,
  type EposProduct,
  type EposTransaction,
} from "@/lib/connectors/epos-now/map";
import { providerJson, readCursor, restaurantContext, utcToZoned, zonedToUtc } from "@/lib/connectors/shared";
import { prisma } from "@/lib/db/prisma";
import { basicAuth } from "@/lib/hub/auth/oauth2";
import type { Connector, ConnectorCtx, SyncPage } from "@/lib/hub/connector";

/** v4 list endpoints return at most 200 rows a page. */
const PAGE_SIZE = 200;

export function eposBase(): string {
  return process.env.EPOS_NOW_API_BASE ?? "https://api.eposnowhq.com";
}

async function call<T>(ctx: Pick<ConnectorCtx, "fetch">, creds: Record<string, string>, path: string): Promise<T> {
  if (!creds.apiKey || !creds.apiSecret) throw new ConnectorError("AUTH", "Epos Now credentials incomplete");
  return providerJson<T>(ctx, "Epos Now", `${eposBase()}${path}`, {
    headers: { Authorization: basicAuth(creds.apiKey, creds.apiSecret), Accept: "application/json" },
  });
}

async function credsOf(ctx: ConnectorCtx): Promise<Record<string, string>> {
  if (!ctx.getCredentials) throw new ConnectorError("AUTH", "Epos Now credentials missing");
  return ctx.getCredentials();
}

const nextDay = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/**
 * Epos Now filters transactions by local trading day, so the cursor walks one day at a time (page by page) up to
 * today; today is re-read on every run because the till keeps adding to it.
 */
async function syncOrders(ctx: ConnectorCtx, raw: string | null): Promise<SyncPage> {
  const now = ctx.now?.() ?? new Date();
  const { timezone, currency } = await restaurantContext(ctx.restaurantId);
  const c = readCursor(raw, eposNowManifest.streams[0].backfillDays, now);
  const day = utcToZoned(new Date(c.since), timezone).slice(0, 10);
  const today = utcToZoned(now, timezone).slice(0, 10);
  const page = Number(c.page ?? 1);

  const txns = await call<EposTransaction[]>(ctx, await credsOf(ctx), `/api/v4/Transaction/GetByDate?startDate=${day}&endDate=${day}&page=${page}`);
  const links = await prisma.menuItemLink.findMany({ where: { restaurantId: ctx.restaurantId, provider: "EPOS_NOW" }, select: { externalId: true, externalName: true } });
  const productNames = new Map(links.map((l) => [l.externalId, l.externalName]));
  const mapped = (Array.isArray(txns) ? txns : []).map((t) => mapEposTransaction(t, { timezone, currency, productNames })).filter((o): o is NonNullable<typeof o> => o !== null);
  if (mapped.length) await ingestOrders(ctx.restaurantId, mapped);

  if (Array.isArray(txns) && txns.length >= PAGE_SIZE) {
    return { rows: mapped.length, nextCursor: JSON.stringify({ since: c.since, page: String(page + 1) }), done: false };
  }
  if (day < today) {
    return { rows: mapped.length, nextCursor: JSON.stringify({ since: zonedToUtc(`${nextDay(day)}T00:00:00`, timezone).toISOString() }), done: false };
  }
  return { rows: mapped.length, nextCursor: JSON.stringify({ since: zonedToUtc(`${today}T00:00:00`, timezone).toISOString() }), done: true };
}

/** FULL streams: the cursor is the next page number; null once a short page comes back. */
async function syncCatalog(ctx: ConnectorCtx, raw: string | null): Promise<SyncPage> {
  const page = Number(raw ?? 1);
  const creds = await credsOf(ctx);
  const [products, categories] = await Promise.all([
    call<EposProduct[]>(ctx, creds, `/api/v4/Product?page=${page}`),
    call<EposCategory[]>(ctx, creds, `/api/v4/Category?page=1`),
  ]);
  const { currency } = await restaurantContext(ctx.restaurantId);
  const items = mapEposProducts(products ?? [], new Map((categories ?? []).map((c) => [c.Id, c.Name ?? ""])), currency);
  await upsertCatalog(ctx.restaurantId, "EPOS_NOW", items, ctx.now?.());
  const more = (products ?? []).length >= PAGE_SIZE;
  return { rows: items.length, nextCursor: more ? String(page + 1) : null, done: !more };
}

async function syncCustomers(ctx: ConnectorCtx, raw: string | null): Promise<SyncPage> {
  const page = Number(raw ?? 1);
  const customers = await call<EposCustomer[]>(ctx, await credsOf(ctx), `/api/v4/Customer?page=${page}`);
  await ingestGuests(ctx.restaurantId, (customers ?? []).map(mapEposCustomer));
  const more = (customers ?? []).length >= PAGE_SIZE;
  return { rows: (customers ?? []).length, nextCursor: more ? String(page + 1) : null, done: !more };
}

export const eposNowConnector: Connector = {
  manifest: eposNowManifest,
  async validateCredentials(input, ctx) {
    if (!input.apiKey || !input.apiSecret) return { ok: false, error: "API key and secret are both required" };
    try {
      await call(ctx ?? {}, input, "/api/v4/Category?page=1");
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof ConnectorError && e.code === "AUTH" ? "Epos Now rejected that key and secret" : "Couldn't reach Epos Now" };
    }
  },
  async sync(ctx, stream, cursor) {
    if (stream === "orders") return syncOrders(ctx, cursor);
    if (stream === "catalog") return syncCatalog(ctx, cursor);
    if (stream === "customers") return syncCustomers(ctx, cursor);
    throw new ConnectorError("VALIDATION", `Epos Now has no stream ${stream}`);
  },
};
