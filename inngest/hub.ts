import { cron } from "inngest";
import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/db/prisma";
import { refreshHealth } from "@/lib/hub/health";
import { getManifest } from "@/lib/hub/manifest";
import { runStream, type HubStep } from "@/lib/hub/sync/run";
import { dueStreams, ensureCursors } from "@/lib/hub/sync/scheduler";
import { dueForRefresh, refreshAccessToken } from "@/lib/hub/tokens";
import { processConnectorEvent, staleEventIds } from "@/lib/hub/webhooks/process";
import { WEBHOOK_EVENT } from "@/lib/hub/webhooks/router";

export const STREAM_RUN_EVENT = "hub/stream.run";
export const INTEGRATION_CONNECTED_EVENT = "hub/integration.connected";
const DAY_MS = 86_400_000;

/** Integration Hub background work (Spec 2 §3.9–3.10). */

export const hubWebhookProcess = inngest.createFunction(
  {
    id: "kob-hub-webhook-process",
    name: "Hub · process webhook",
    retries: 4,
    concurrency: [{ key: "event.data.eventId", limit: 1 }],
    triggers: [{ event: WEBHOOK_EVENT }],
  },
  async ({ event, step }) => step.run("process", () => processConnectorEvent(String((event.data as { eventId: string }).eventId))),
);

/** Safety net for events stored but never enqueued: re-send within 3 days. */
export const hubWebhookSweep = inngest.createFunction(
  { id: "kob-hub-webhook-sweep", name: "Hub · webhook sweep", retries: 1, triggers: [cron("*/10 * * * *")] },
  async ({ step }) => {
    const ids = await step.run("find-stale", () => staleEventIds());
    if (ids.length) await step.sendEvent("resend", ids.map((eventId: string) => ({ name: WEBHOOK_EVENT, data: { eventId } })));
    return { resent: ids.length };
  },
);

/** Every 5 min: fan out one `hub/stream.run` per due cursor. */
export const hubSyncTick = inngest.createFunction(
  { id: "kob-hub-sync-tick", name: "Hub · sync tick", concurrency: 1, triggers: [cron("*/5 * * * *")] },
  async ({ step }) => {
    const due = await step.run("due", () => dueStreams());
    if (due.length) await step.sendEvent("fan-out", due.map((d: { integrationId: string; stream: string }) => ({ name: STREAM_RUN_EVENT, data: d })));
    return { queued: due.length };
  },
);

/** One stream at a time per integration; each page is a step, so a timeout resumes at the next page. */
export const hubStreamRun = inngest.createFunction(
  {
    id: "kob-hub-stream-run",
    name: "Hub · run stream",
    retries: 3,
    concurrency: [{ key: "event.data.integrationId", limit: 1 }],
    triggers: [{ event: STREAM_RUN_EVENT }],
  },
  async ({ event, step }) => {
    const { integrationId, stream } = event.data as { integrationId: string; stream: string };
    const hubStep: HubStep = {
      run: (id, fn) => step.run(id, fn) as never,
      sleep: (id, ms) => step.sleep(id, ms),
    };
    return runStream(integrationId, stream, hubStep);
  },
);

/** On connect: create cursors (due now) and start every stream's backfill straight away. */
export const hubIntegrationConnected = inngest.createFunction(
  { id: "kob-hub-integration-connected", name: "Hub · backfill on connect", triggers: [{ event: INTEGRATION_CONNECTED_EVENT }] },
  async ({ event, step }) => {
    const { integrationId } = event.data as { integrationId: string };
    const streams = await step.run("cursors", () => ensureCursors(integrationId));
    if (streams.length) {
      await step.sendEvent("backfill", streams.map((s: { stream: string }) => ({ name: STREAM_RUN_EVENT, data: { integrationId, stream: s.stream } })));
    }
    return { streams: streams.length };
  },
);

/** Daily: refresh tokens entering their window in the next day (Square at day 7 of 30). */
export const hubTokenRefresh = inngest.createFunction(
  { id: "kob-hub-token-refresh", name: "Hub · token refresh", concurrency: 1, triggers: [cron("0 4 * * *")] },
  async ({ step }) => {
    const due = await step.run("due", () => dueForRefresh(new Date(), DAY_MS));
    let ok = 0;
    for (const { id } of due) {
      const res = await step.run(`refresh-${id}`, () =>
        refreshAccessToken(id, { horizonMs: DAY_MS }).then(
          () => true,
          () => false,
        ),
      );
      if (res) ok += 1;
    }
    return { due: due.length, refreshed: ok };
  },
);

/** Every 30 min: recompute CONNECTED / DEGRADED / PENDING_APPROVAL for hub-managed integrations. */
export const hubHealth = inngest.createFunction(
  { id: "kob-hub-health", name: "Hub · health", concurrency: 1, triggers: [cron("*/30 * * * *")] },
  async ({ step }) => {
    const ids = await step.run("list", async () => {
      const rows = await prisma.integration.findMany({ where: { status: { notIn: ["DISCONNECTED"] } }, select: { id: true, provider: true } });
      return rows.filter((r) => getManifest(r.provider)).map((r) => r.id);
    });
    const counts: Record<string, number> = {};
    for (const id of ids) {
      const status = await step.run(`health-${id}`, () => refreshHealth(id));
      if (status) counts[status] = (counts[status] ?? 0) + 1;
    }
    return counts;
  },
);

export const hubFunctions = [hubWebhookProcess, hubWebhookSweep, hubSyncTick, hubStreamRun, hubIntegrationConnected, hubTokenRefresh, hubHealth];
