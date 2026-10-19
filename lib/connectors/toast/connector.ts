import { ingestOrders, upsertCatalog } from "@/lib/commerce/ingest";
import { ConnectorError } from "@/lib/connectors/errors";
import { providerJson, readCursor, restaurantContext } from "@/lib/connectors/shared";
import { toastManifest } from "@/lib/connectors/toast/manifest";
import { mapToastMenus, mapToastOrder, type ToastMenuGroup, type ToastOrder } from "@/lib/connectors/toast/map";
import type { Connector, ConnectorCtx, SyncPage } from "@/lib/hub/connector";

const PAGE_SIZE = 100;
const WINDOW_MS = 7 * 86_400_000;
/** Re-read the last few minutes each run: Toast's modifiedDate can land slightly after the write is visible. */
const OVERLAP_MS = 10 * 60_000;

export function toastBase(): string {
  return process.env.TOAST_API_BASE ?? "https://ws-api.toasttab.com";
}

/** Toast wants `yyyy-MM-dd'T'HH:mm:ss.SSSZ` with a numeric offset. */
export function toastDate(d: Date): string {
  return d.toISOString().replace("Z", "+0000");
}

type Creds = { clientId: string; clientSecret: string; restaurantGuid: string };

/** Machine-client tokens last ~24 h; cached per integration so a sync run logs in once. */
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

export function clearToastTokenCache(): void {
  tokenCache.clear();
}

async function login(ctx: Pick<ConnectorCtx, "fetch">, creds: Pick<Creds, "clientId" | "clientSecret">): Promise<{ token: string; expiresAt: number }> {
  const res = await providerJson<{ token?: { accessToken?: string; expiresIn?: number } }>(ctx, "Toast", `${toastBase()}/authentication/v1/authentication/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ clientId: creds.clientId, clientSecret: creds.clientSecret, userAccessType: "TOAST_MACHINE_CLIENT" }),
  });
  if (!res.token?.accessToken) throw new ConnectorError("AUTH", "Toast login returned no token");
  return { token: res.token.accessToken, expiresAt: Date.now() + Math.max(60, (res.token.expiresIn ?? 3600) - 300) * 1000 };
}

async function creds(ctx: ConnectorCtx): Promise<Creds> {
  if (!ctx.getCredentials) throw new ConnectorError("AUTH", "Toast credentials missing");
  const c = await ctx.getCredentials();
  if (!c.clientId || !c.clientSecret || !c.restaurantGuid) throw new ConnectorError("AUTH", "Toast credentials incomplete");
  return { clientId: c.clientId, clientSecret: c.clientSecret, restaurantGuid: c.restaurantGuid };
}

async function call<T>(ctx: ConnectorCtx, path: string): Promise<T> {
  const c = await creds(ctx);
  const attempt = async (fresh: boolean) => {
    let cached = tokenCache.get(ctx.integrationId);
    if (fresh || !cached || cached.expiresAt <= Date.now()) {
      cached = await login(ctx, c);
      tokenCache.set(ctx.integrationId, cached);
    }
    return providerJson<T>(ctx, "Toast", `${toastBase()}${path}`, {
      headers: { Authorization: `Bearer ${cached.token}`, "Toast-Restaurant-External-ID": c.restaurantGuid, Accept: "application/json" },
    });
  };
  try {
    return await attempt(false);
  } catch (e) {
    // A cached token Toast has already expired: log in once more before treating it as bad credentials.
    if (e instanceof ConnectorError && e.code === "AUTH" && tokenCache.has(ctx.integrationId)) {
      tokenCache.delete(ctx.integrationId);
      return attempt(true);
    }
    throw e;
  }
}

/**
 * Walks modifiedDate in 7-day windows (ordersBulk limits the range), 100 orders a page. The cursor's `page` is the
 * page number inside the current window; when the window reaches now, the next run starts a little before it.
 */
async function syncOrders(ctx: ConnectorCtx, raw: string | null): Promise<SyncPage> {
  const now = ctx.now?.() ?? new Date();
  const c = readCursor(raw, toastManifest.streams[0].backfillDays, now);
  const start = new Date(c.since);
  const end = new Date(Math.min(start.getTime() + WINDOW_MS, now.getTime()));
  const page = Number(c.page ?? 1);
  const q = new URLSearchParams({ startDate: toastDate(start), endDate: toastDate(end), pageSize: String(PAGE_SIZE), page: String(page) });
  const orders = await call<ToastOrder[]>(ctx, `/orders/v2/ordersBulk?${q}`);
  const { currency } = await restaurantContext(ctx.restaurantId);
  const mapped = (Array.isArray(orders) ? orders : []).map((o) => mapToastOrder(o, currency)).filter((o): o is NonNullable<typeof o> => o !== null);
  if (mapped.length) await ingestOrders(ctx.restaurantId, mapped);

  if (Array.isArray(orders) && orders.length >= PAGE_SIZE) {
    return { rows: mapped.length, nextCursor: JSON.stringify({ since: c.since, page: String(page + 1) }), done: false };
  }
  if (end.getTime() < now.getTime()) {
    return { rows: mapped.length, nextCursor: JSON.stringify({ since: end.toISOString() }), done: false };
  }
  return { rows: mapped.length, nextCursor: JSON.stringify({ since: new Date(end.getTime() - OVERLAP_MS).toISOString() }), done: true };
}

async function syncCatalog(ctx: ConnectorCtx): Promise<SyncPage> {
  const res = await call<{ menus?: { menuGroups?: ToastMenuGroup[] }[] }>(ctx, "/menus/v2/menus");
  const { currency } = await restaurantContext(ctx.restaurantId);
  const items = mapToastMenus(res.menus ?? [], currency);
  await upsertCatalog(ctx.restaurantId, "TOAST", items, ctx.now?.());
  return { rows: items.length, nextCursor: null, done: true };
}

export const toastConnector: Connector = {
  manifest: toastManifest,
  async validateCredentials(input, ctx) {
    const { clientId, clientSecret, restaurantGuid } = input;
    if (!clientId || !clientSecret || !restaurantGuid) return { ok: false, error: "Client ID, client secret and restaurant GUID are all required" };
    try {
      const { token } = await login({ fetch: ctx?.fetch }, { clientId, clientSecret });
      await providerJson(ctx ?? {}, "Toast", `${toastBase()}/menus/v2/metadata`, {
        headers: { Authorization: `Bearer ${token}`, "Toast-Restaurant-External-ID": restaurantGuid, Accept: "application/json" },
      });
      return { ok: true, externalAccountId: restaurantGuid };
    } catch (e) {
      return { ok: false, error: e instanceof ConnectorError && e.code === "AUTH" ? "Toast rejected those credentials" : "Couldn't reach Toast with those details" };
    }
  },
  async sync(ctx, stream, cursor) {
    if (stream === "orders") return syncOrders(ctx, cursor);
    if (stream === "catalog") return syncCatalog(ctx);
    throw new ConnectorError("VALIDATION", `Toast has no stream ${stream}`);
  },
};
