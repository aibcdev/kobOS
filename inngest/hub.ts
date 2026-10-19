import { cron } from "inngest";
import { inngest } from "@/inngest/client";
import { processConnectorEvent, staleEventIds } from "@/lib/hub/webhooks/process";
import { WEBHOOK_EVENT } from "@/lib/hub/webhooks/router";

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

export const hubFunctions = [hubWebhookProcess, hubWebhookSweep];
