import { cron } from "inngest";
import { inngest } from "@/inngest/client";
import { expireTrials, trialsEndingSoon } from "@/lib/billing/trial";

export const TRIAL_ENDING_EVENT = "billing/trial.ending";
export const TRIAL_ENDED_EVENT = "billing/trial.ended";

/**
 * Hourly: trials past their end with no card become TRIAL_ENDED (read-only, nothing charged), and trials two days
 * from the end get a reminder. Owner emails listen for these events.
 */
export const trialTick = inngest.createFunction(
  { id: "kob-billing-trial-tick", name: "Billing · trial tick", retries: 2, concurrency: 1, triggers: [cron("5 * * * *")] },
  async ({ step }) => {
    const now = new Date();
    const ended = await step.run("expire", () => expireTrials(now));
    const ending = await step.run("ending-soon", () => trialsEndingSoon(now));
    if (ended.length) await step.sendEvent("ended", ended.map((r) => ({ name: TRIAL_ENDED_EVENT, data: { restaurantId: r.id } })));
    if (ending.length) await step.sendEvent("ending", ending.map((r) => ({ name: TRIAL_ENDING_EVENT, data: { restaurantId: r.id } })));
    return { ended: ended.length, ending: ending.length };
  },
);

export const billingFunctions = [trialTick];
