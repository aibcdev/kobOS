import { cron } from "inngest";
import { inngest } from "@/inngest/client";
import { TRIAL_ENDED_EVENT, TRIAL_ENDING_EVENT } from "@/inngest/billing";
import { generateDailyRecommendationsForRestaurant } from "@/lib/demand-engine/generate-daily-recommendations";
import { sendDailyBrief, sendTrialEnded, sendTrialEnding, sendWeeklySummary } from "@/lib/email/owner";
import { isLocalMonday, morningCandidates, morningDue } from "@/lib/email/schedule";

export const MORNING_EVENT = "restaurant/morning.run";

/**
 * Every 15 minutes: restaurants where it's now 07:00 get their morning run — offers for quiet nights, today's
 * brief, and the brief email (plus the weekly summary on Mondays). Google listing and reviews sync on their own
 * schedule (hub streams), so the brief reads what's already there.
 */
export const morningTick = inngest.createFunction(
  { id: "kob-morning-tick", name: "Morning · tick", retries: 1, concurrency: 1, triggers: [cron("*/15 * * * *")] },
  async ({ step }) => {
    const due = await step.run("due", async () => {
      const now = new Date();
      return (await morningCandidates()).filter((c) => morningDue(now, c.timezone));
    });
    if (due.length) await step.sendEvent("run", due.map((c) => ({ name: MORNING_EVENT, data: { restaurantId: c.id } })));
    return { due: due.length };
  },
);

export const morningRun = inngest.createFunction(
  {
    id: "kob-morning-run",
    name: "Morning · run for a restaurant",
    retries: 2,
    concurrency: [{ key: "event.data.restaurantId", limit: 1 }],
    triggers: [{ event: MORNING_EVENT }],
  },
  async ({ event, step }) => {
    const { restaurantId } = event.data as { restaurantId: string };
    const now = new Date();
    await step.run("offers", () => generateDailyRecommendationsForRestaurant(restaurantId, { now }));
    const brief = await step.run("brief-email", () => sendDailyBrief(restaurantId, now));
    const weekly = await step.run("weekly", async () => {
      const { prisma } = await import("@/lib/db/prisma");
      const { timezone } = await prisma.restaurant.findUniqueOrThrow({ where: { id: restaurantId }, select: { timezone: true } });
      return isLocalMonday(now, timezone) ? sendWeeklySummary(restaurantId, now) : null;
    });
    return { brief, weekly };
  },
);

export const trialEndingEmail = inngest.createFunction(
  { id: "kob-email-trial-ending", name: "Email · trial ending", retries: 3, triggers: [{ event: TRIAL_ENDING_EVENT }] },
  async ({ event }) => sendTrialEnding((event.data as { restaurantId: string }).restaurantId),
);

export const trialEndedEmail = inngest.createFunction(
  { id: "kob-email-trial-ended", name: "Email · trial ended", retries: 3, triggers: [{ event: TRIAL_ENDED_EVENT }] },
  async ({ event }) => sendTrialEnded((event.data as { restaurantId: string }).restaurantId),
);

export const morningFunctions = [morningTick, morningRun, trialEndingEmail, trialEndedEmail];
