import { Inngest } from "inngest";

/**
 * Runtime-only read (bracket access) so a local `netlify deploy --build` with
 * `.env.local` INNGEST_DEV=1 cannot bake mode:"dev" into the production bundle.
 * Local: set INNGEST_DEV=1. Production: always cloud mode.
 */
function readInngestDevFlag(): boolean {
  // Never run Inngest in local-dev mode on production hosts — that hits 127.0.0.1:8288.
  if (process.env.NODE_ENV === "production") return false;
  const raw = process.env["INNGEST_DEV"];
  return raw === "1" || raw === "true";
}

export const inngest = new Inngest({
  id: "kob-growth-agent",
  name: "KOB Growth Agent",
  isDev: readInngestDevFlag(),
});
