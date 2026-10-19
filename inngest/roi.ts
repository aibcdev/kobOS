import { cron } from "inngest";
import { inngest } from "@/inngest/client";
import { deliverWeek, dueNow, weeklyCandidates } from "@/lib/roi/deliver";

export const ROI_DELIVER_EVENT = "roi/week.deliver";

/**
 * Monday 08:30 local happens between Sunday 19:30 UTC (UTC+13) and Monday 18:30 UTC (UTC−10), so the tick runs
 * every 15 minutes on Sunday and Monday UTC and fans out to restaurants whose local window is open.
 */
export const roiWeeklyTick = inngest.createFunction(
  { id: "kob-roi-weekly-tick", name: "ROI · weekly tick", retries: 1, concurrency: 1, triggers: [cron("*/15 * * * 0,1")] },
  async ({ step }) => {
    const due = await step.run("due", async () => dueNow(await weeklyCandidates(), new Date()));
    if (due.length) await step.sendEvent("deliver", due.map((data) => ({ name: ROI_DELIVER_EVENT, data })));
    return { due: due.length };
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

export const roiFunctions = [roiWeeklyTick, roiWeekDeliver];
