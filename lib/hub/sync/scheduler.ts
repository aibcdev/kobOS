import { prisma } from "@/lib/db/prisma";
import { flag, FLAGS, type FlagName } from "@/lib/flags";
import { connectorFor } from "@/lib/hub/connector";
import { getManifest, type ConnectorManifest, type StreamSpec } from "@/lib/hub/manifest";
import { nextCronTime } from "@/lib/hub/sync/cron";

/** Spec 2 §3.10. Which streams run when. Webhook-driven streams still poll on their schedule as a safety net. */

export const SYNCING_STATUSES = ["CONNECTED", "DEGRADED"];
const MAX_JITTER_MS = 60_000;

export function streamSpec(provider: string, stream: string): StreamSpec | undefined {
  return getManifest(provider)?.streams.find((s) => s.name === stream);
}

/** Next scheduled run with up to a minute of jitter so tenants on the same cron don't stampede a provider. */
export function nextRunAt(spec: StreamSpec, from: Date, random = Math.random): Date {
  return new Date(nextCronTime(spec.schedule, from).getTime() + Math.floor(random() * MAX_JITTER_MS));
}

/** Failure backoff: 5 min, 15 min, 45 min … capped at 6 h. */
export function failureBackoffMs(failureCount: number): number {
  return Math.min(5 * 60_000 * 3 ** Math.max(0, failureCount - 1), 6 * 3_600_000);
}

export async function connectorEnabled(manifest: ConnectorManifest, restaurantId: string): Promise<boolean> {
  const name = manifest.approval.flag;
  return (FLAGS as readonly string[]).includes(name) && flag(name as FlagName, restaurantId);
}

/** On connect: one cursor per manifest stream, due now, so the backfill starts immediately. Existing cursors are kept. */
export async function ensureCursors(integrationId: string, now = new Date()): Promise<{ stream: string }[]> {
  const integration = await prisma.integration.findUniqueOrThrow({ where: { id: integrationId } });
  const manifest = getManifest(integration.provider);
  if (!manifest) return [];
  for (const s of manifest.streams) {
    await prisma.syncCursor.upsert({
      where: { integrationId_stream: { integrationId, stream: s.name } },
      create: { integrationId, stream: s.name, nextRunAt: now },
      update: {},
    });
  }
  return manifest.streams.map((s) => ({ stream: s.name }));
}

/** Cursors due to run for healthy, enabled integrations that have a registered connector. */
export async function dueStreams(now = new Date(), limit = 500): Promise<{ integrationId: string; stream: string }[]> {
  const rows = await prisma.syncCursor.findMany({
    where: { nextRunAt: { lte: now }, integration: { status: { in: SYNCING_STATUSES } } },
    orderBy: { nextRunAt: "asc" },
    take: limit,
    include: { integration: { select: { provider: true, restaurantId: true } } },
  });
  const out: { integrationId: string; stream: string }[] = [];
  for (const r of rows) {
    const manifest = getManifest(r.integration.provider);
    if (!manifest || !connectorFor(manifest.provider) || !streamSpec(manifest.provider, r.stream)) continue;
    if (!(await connectorEnabled(manifest, r.integration.restaurantId))) continue;
    out.push({ integrationId: r.integrationId, stream: r.stream });
  }
  return out;
}
