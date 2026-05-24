import { Inngest } from "inngest";

const inngestDev =
  process.env.INNGEST_DEV === "1" ||
  process.env.INNGEST_DEV === "true" ||
  process.env.NODE_ENV === "development";

export const inngest = new Inngest({
  id: "kob-growth-agent",
  name: "KOB Growth Agent",
  /** Local `inngest dev` — also set INNGEST_DEV=1 in .env.local */
  isDev: inngestDev,
});
