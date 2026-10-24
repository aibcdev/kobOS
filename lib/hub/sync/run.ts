import { prisma } from "@/lib/db/prisma";
import { ConnectorError } from "@/lib/connectors/errors";
import { TokenError } from "@/lib/hub/auth/oauth2";
import { connectorFor } from "@/lib/hub/connector";
import { connectorCtx } from "@/lib/hub/ctx";
import { getManifest } from "@/lib/hub/manifest";
import { failureBackoffMs, nextRunAt, streamSpec } from "@/lib/hub/sync/scheduler";

/** The subset of Inngest's `step` the runner needs (tests pass a plain implementation). */
export type HubStep = {
  run<T>(id: string, fn: () => Promise<T>): Promise<T>;
  sleep(id: string, ms: number): Promise<void>;
};

export type PageResult = { done: boolean; rows: number; retryAfterMs?: number };

export const MAX_PAGES_PER_RUN = 200;

/**
 * One page: read the cursor, call connector.sync, checkpoint the new cursor. A crash after this commits resumes at
 * the next page; a crash before it repeats this page (connectors write idempotently).
 */
export async function syncOnePage(integrationId: string, stream: string, now = new Date()): Promise<PageResult> {
  const cursor = await prisma.syncCursor.findUniqueOrThrow({
    where: { integrationId_stream: { integrationId, stream } },
    include: { integration: true },
  });
  const integration = cursor.integration;
  const connector = connectorFor(integration.provider);
  const spec = streamSpec(integration.provider, stream);
  if (!connector || !spec) throw new Error(`No connector or stream for ${integration.provider}/${stream}`);

  try {
    const page = await connector.sync(connectorCtx(integration), stream, cursor.cursor);
    const done = page.done || page.nextCursor === null;
    await prisma.syncCursor.update({
      where: { id: cursor.id },
      data: {
        cursor: done && spec.mode === "FULL" ? null : (page.nextCursor ?? cursor.cursor),
        lastRunAt: now,
        rowsLastRun: { increment: page.rows },
        ...(done
          ? { backfillDone: true, lastSuccessAt: now, lastError: null, failureCount: 0, nextRunAt: nextRunAt(spec, now) }
          : {}),
      },
    });
    if (done) await prisma.integration.update({ where: { id: integrationId }, data: { lastSuccessAt: now } });
    return { done, rows: page.rows };
  } catch (e) {
    if (e instanceof ConnectorError && e.code === "RATE_LIMIT") {
      return { done: false, rows: 0, retryAfterMs: Math.max(1000, e.retryAfterMs ?? 30_000) };
    }
    const failureCount = cursor.failureCount + 1;
    const message = (e instanceof Error ? e.message : String(e)).slice(0, 500);
    const authDead = (e instanceof TokenError && e.code === "reauth_required") || (e instanceof ConnectorError && e.code === "AUTH");
    await prisma.syncCursor.update({
      where: { id: cursor.id },
      data: { lastRunAt: now, lastError: message, failureCount, nextRunAt: new Date(now.getTime() + failureBackoffMs(failureCount)) },
    });
    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        lastErrorAt: now,
        lastErrorCode: e instanceof ConnectorError ? e.code : e instanceof TokenError ? e.code : "SYNC_ERROR",
        ...(authDead ? { status: "REAUTH" } : {}),
      },
    });
    if (authDead) void notifyReconnect(integrationId);
    throw e;
  }
}

/**
 * Runs a stream page by page, each page its own step so a timeout or deploy resumes rather than restarts. Honours
 * provider Retry-After and the manifest's rps between pages.
 */
export async function runStream(integrationId: string, stream: string, step: HubStep): Promise<{ pages: number; rows: number; done: boolean }> {
  const meta = await step.run("load", async () => {
    const row = await prisma.integration.findUniqueOrThrow({ where: { id: integrationId }, select: { provider: true } });
    return { rps: getManifest(row.provider)?.rateLimit.rps ?? null };
  });
  const gapMs = meta.rps ? Math.ceil(1000 / meta.rps) : 0;
  let rows = 0;
  let waits = 0;
  for (let page = 0; page < MAX_PAGES_PER_RUN; page++) {
    const res = await step.run(`page-${page}${waits ? `-r${waits}` : ""}`, () => syncOnePage(integrationId, stream));
    if (res.retryAfterMs) {
      waits += 1;
      await step.sleep(`rate-limit-${page}-${waits}`, res.retryAfterMs);
      page -= 1;
      continue;
    }
    rows += res.rows;
    if (res.done) return { pages: page + 1, rows, done: true };
    if (gapMs) await step.sleep(`gap-${page}`, gapMs);
  }
  return { pages: MAX_PAGES_PER_RUN, rows, done: false };
}

/** Google access was revoked or expired: ask the owner to reconnect (at most weekly). Best-effort. */
async function notifyReconnect(integrationId: string): Promise<void> {
  try {
    const row = await prisma.integration.findUnique({ where: { id: integrationId }, select: { restaurantId: true, provider: true } });
    if (row?.provider !== "GBP") return;
    const { sendReconnectGoogle } = await import("@/lib/email/owner");
    await sendReconnectGoogle(row.restaurantId);
  } catch (e) {
    console.warn("[sync] reconnect email", e instanceof Error ? e.message : e);
  }
}
