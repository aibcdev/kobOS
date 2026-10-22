import { ConnectorError } from "@/lib/connectors/errors";
import { createGbpAdapter } from "@/lib/connectors/gbp/adapter";
import { gbpClient, type GbpClient } from "@/lib/connectors/gbp/client";
import { gbpManifest } from "@/lib/connectors/gbp/manifest";
import { proposeReviewReplies } from "@/lib/connectors/gbp/producer";
import { upsertGbpReviews } from "@/lib/connectors/gbp/reviews";
import { prisma } from "@/lib/db/prisma";
import type { Connector, ConnectorCtx, ExternalLocation, SyncPage } from "@/lib/hub/connector";
import { requireLocationChoice } from "@/lib/hub/locations";

/** Accounts read for locations; agencies with more are out of scope for a single restaurant. */
const MAX_ACCOUNTS = 5;

async function client(ctx: ConnectorCtx): Promise<GbpClient> {
  return gbpClient(await ctx.getAccessToken(), ctx.fetch);
}

/** externalId is the full `accounts/{a}/locations/{l}` so reviews can be addressed without another lookup. */
async function listLocations(ctx: ConnectorCtx): Promise<ExternalLocation[]> {
  const c = await client(ctx);
  const accounts = (await c.accounts()).slice(0, MAX_ACCOUNTS);
  const out: ExternalLocation[] = [];
  for (const a of accounts) {
    for (const l of await c.locations(a.name)) out.push({ externalId: `${a.name}/${l.name}`, name: l.title, address: l.address ?? undefined });
  }
  return out;
}

/** One KOB restaurant answers for one Google location; that location id is the account id the unique index guards. */
export async function chooseGbpLocation(integrationId: string, externalId: string): Promise<void> {
  const row = await prisma.integration.findUniqueOrThrow({ where: { id: integrationId }, select: { metadata: true, status: true } });
  await prisma.integration.update({
    where: { id: integrationId },
    data: {
      metadata: { ...((row.metadata ?? {}) as Record<string, unknown>), locationIds: [externalId] },
      externalAccountId: externalId,
      ...(row.status === "PENDING_SETUP" ? { status: "CONNECTED" } : {}),
    },
  });
}

async function reviewLocation(ctx: ConnectorCtx): Promise<string | "needs_choice" | null> {
  if (ctx.locationIds?.length) return ctx.locationIds[0];
  const all = await listLocations(ctx);
  if (all.length > 1) return "needs_choice";
  if (!all.length) return null;
  await chooseGbpLocation(ctx.integrationId, all[0].externalId);
  return all[0].externalId;
}

async function syncReviews(ctx: ConnectorCtx, raw: string | null): Promise<SyncPage> {
  const location = await reviewLocation(ctx);
  if (location === "needs_choice") {
    await requireLocationChoice(ctx.integrationId);
    return { rows: 0, nextCursor: raw, done: true };
  }
  if (!location) return { rows: 0, nextCursor: raw, done: true };
  const m = /^(accounts\/[^/]+)\/(locations\/[^/]+)$/.exec(location);
  if (!m) throw new ConnectorError("VALIDATION", `Bad GBP location ${location}`);
  const [, account, loc] = m;

  const since = raw ? ((JSON.parse(raw) as { since?: string }).since ?? null) : null;
  const reviews = (await (await client(ctx)).reviews(account, loc)).filter((r) => !since || r.updateTime > since);
  const unanswered = await upsertGbpReviews(ctx.restaurantId, reviews);
  await proposeReviewReplies(ctx.restaurantId, unanswered, { now: ctx.now?.() });
  const maxSeen = reviews.reduce<string | null>((m, r) => (!m || r.updateTime > m ? r.updateTime : m), since);
  return { rows: reviews.length, nextCursor: JSON.stringify({ since: maxSeen }), done: true };
}

export const gbpConnector: Connector = {
  manifest: gbpManifest,
  async validateCredentials(input, ctx) {
    if (!input.accessToken) return { ok: false, error: "Missing access token" };
    try {
      await gbpClient(input.accessToken, ctx?.fetch).accounts();
      // The account id is set when a location is picked: one Google account can own several restaurants.
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof ConnectorError ? e.message : "Google check failed" };
    }
  },
  listLocations,
  async sync(ctx, stream, cursor) {
    if (stream === "reviews") return syncReviews(ctx, cursor);
    throw new ConnectorError("VALIDATION", `GBP has no stream ${stream}`);
  },
  actions: createGbpAdapter(),
};
