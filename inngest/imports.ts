import { inngest } from "@/inngest/client";
import { handleInboundEmail } from "@/lib/hub/imports/inbound";
import { runImport } from "@/lib/hub/imports/pipeline";
import { fetchReceivedAttachments } from "@/lib/hub/imports/resend-inbound";

export const IMPORT_CREATED_EVENT = "hub/import.created";
export const INBOUND_EMAIL_EVENT = "hub/inbound-email.received";

/** Import framework (Spec 2 §3.7): parse and ingest off the request path. */
export const importRun = inngest.createFunction(
  {
    id: "kob-import-run",
    name: "Imports · run",
    retries: 2,
    concurrency: [{ key: "event.data.importJobId", limit: 1 }],
    triggers: [{ event: IMPORT_CREATED_EVENT }],
  },
  async ({ event, step }) =>
    step.run("run", async () => {
      const job = await runImport(String((event.data as { importJobId: string }).importJobId));
      return { status: job.status, rows: job.rowsImported };
    }),
);

/** Inbound statements: download attachments, create imports, fan out one run per new job. */
export const importInboundEmail = inngest.createFunction(
  { id: "kob-import-inbound-email", name: "Imports · inbound email", retries: 3, triggers: [{ event: INBOUND_EMAIL_EVENT }] },
  async ({ event, step }) => {
    const { emailId, to } = event.data as { emailId: string; to: string[] };
    const results = await step.run("create-imports", async () => handleInboundEmail({ to, attachments: await fetchReceivedAttachments(emailId) }));
    const jobIds = results.flatMap((r) => r.jobIds);
    if (jobIds.length) await step.sendEvent("run-imports", jobIds.map((importJobId) => ({ name: IMPORT_CREATED_EVENT, data: { importJobId } })));
    return { created: jobIds.length, duplicates: results.reduce((s, r) => s + r.duplicates, 0) };
  },
);

export const importFunctions = [importRun, importInboundEmail];
