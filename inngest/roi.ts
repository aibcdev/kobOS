import { cron } from "inngest";
import { inngest } from "@/inngest/client";
import { usageRestaurants } from "@/lib/roi/cost";
import { deliverWeek, dueNow, weeklyCandidates } from "@/lib/roi/deliver";
import { saveWeek } from "@/lib/roi/ledger";

export const ROI_DELIVER_EVENT = "roi/week.deliver";
export const ROI_CLOSE_EVENT = "roi/week.close";

/**
 * Monday 08:30 local happens between Sunday 19:30 UTC (UTC+13) and Monday 18:30 UTC (UTC−10), so the tick runs
 * every 15 minutes on Sunday and Monday UTC and fans out to restaurants whose local window is open. Restaurants with
 * metered usage but no email still get their week saved, so cost is recorded for everyone.
 */
export const roiWeeklyTick = inngest.createFunction(
  { id: "kob-roi-weekly-tick", name: "ROI · weekly tick", retries: 1, concurrency: 1, triggers: [cron("*/15 * * * 0,1")] },
  async ({ step }) => {
    const { deliver, close } = await step.run("due", async () => {
      const now = new Date();
      const deliver = dueNow(await weeklyCandidates(), now);
      const emailed = new Set(deliver.map((d) => d.restaurantId));
      const close = dueNow(await usageRestaurants(new Date(now.getTime() - 9 * 86_400_000)), now).filter((d) => !emailed.has(d.restaurantId));
      return { deliver, close };
    });
    if (deliver.length) await step.sendEvent("deliver", deliver.map((data) => ({ name: ROI_DELIVER_EVENT, data })));
    if (close.length) await step.sendEvent("close", close.map((data) => ({ name: ROI_CLOSE_EVENT, data })));
    return { deliver: deliver.length, close: close.length };
  },
);

export const roiWeekDeliver = inngest.createFunction(
  {
    id: "kob-roi-week-deliver",
    name: "ROI · deliver week",
    retries: 3,
    concurrency: [{ key: "event.data.restaurantId", limit: 1 }],
    triggers: [{ event: ROI_DELIVER_EVENT }],
  },
  async ({ event, step }) => {
    const { restaurantId, weekStart } = event.data as { restaurantId: string; weekStart: string };
    return step.run("deliver", () => deliverWeek(restaurantId, weekStart));
  },
);

export const roiWeekClose = inngest.createFunction(
  {
    id: "kob-roi-week-close",
    name: "ROI · close week",
    retries: 3,
    concurrency: [{ key: "event.data.restaurantId", limit: 1 }],
    triggers: [{ event: ROI_CLOSE_EVENT }],
  },
  async ({ event, step }) => {
    const { restaurantId, weekStart } = event.data as { restaurantId: string; weekStart: string };
    return step.run("close", async () => {
      const row = await saveWeek(restaurantId, weekStart);
      return { weekStart, costMicros: String(row.costMicros ?? 0) };
    });
  },
);

export const roiFunctions = [roiWeeklyTick, roiWeekDeliver, roiWeekClose];
