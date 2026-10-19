import { cron } from "inngest";
import { inngest } from "@/inngest/client";
import { ACTION_APPROVED_EVENT, ACTION_VERIFY_LATER_EVENT, type ActionApprovedData } from "@/lib/agent/events";
import { executeApprovedAction, failAfterRetries, verifyPending, type ExecStep } from "@/lib/agent/executor";
import { registerAllConnectors } from "@/lib/connectors";

// Ledger adapters (GBP review replies, …) must be registered before any approved action runs.
registerAllConnectors();

export const actionExecute = inngest.createFunction(
  {
    id: "kob-action-execute",
    name: "Actions · execute and verify",
    retries: 4,
    concurrency: [
      { key: "event.data.restaurantId", limit: 2 },
      { key: "event.data.connectorKey", limit: 1 },
    ],
    triggers: [{ event: ACTION_APPROVED_EVENT }],
    onFailure: async ({ event, error }) => {
      const data = (event.data as { event: { data: ActionApprovedData } }).event.data;
      await failAfterRetries(data.actionId, error);
    },
  },
  async ({ event, step }) => {
    // Every value the executor passes through step.run is JSON-safe (dates are ISO strings).
    const exec: ExecStep = {
      run: (id, fn) => step.run(id, fn) as never,
      sleep: (id, duration) => step.sleep(id, duration as never),
      sleepUntil: (id, until) => step.sleepUntil(id, until),
      sendEvent: (id, payload) => step.sendEvent(id, payload),
    };
    return executeApprovedAction(event.data as ActionApprovedData, exec);
  },
);

export const actionVerifyLater = inngest.createFunction(
  {
    id: "kob-action-verify-later",
    name: "Actions · long verify",
    concurrency: 1,
    triggers: [cron("*/15 * * * *"), { event: ACTION_VERIFY_LATER_EVENT }],
  },
  async ({ step }) => step.run("verify-pending", () => verifyPending()),
);

export const actionFunctions = [actionExecute, actionVerifyLater];
