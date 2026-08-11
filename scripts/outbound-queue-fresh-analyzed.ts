import { LeadProspectStatus } from "@prisma/client";
import { prisma } from "../lib/db/prisma";
import { queueProspectOutreach } from "../lib/lead-engine/run-outreach-writer";
import { isAlreadyContacted, loadSentContactSets } from "../lib/outbound/outbound-send-dedupe";

async function main() {
  const ws = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID!.trim();
  const sent = await loadSentContactSets(ws);
  const analyzed = await prisma.leadProspect.findMany({
    where: {
      workspaceRestaurantId: ws,
      status: LeadProspectStatus.ANALYZED,
      contactEmail: { not: null },
      outboundLeadId: null,
    },
    orderBy: { kobOpportunityScore: "desc" },
  });

  const fresh = analyzed.filter((a) => !isAlreadyContacted(a, sent).skip);
  console.log(`fresh analyzed=${fresh.length}`);

  const apply = process.env.OUTBOUND_QUEUE_FRESH === "1";
  const skip: Record<string, number> = {};
  let queued = 0;
  if (!apply) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          wouldQueue: fresh.length,
          tip: "Set OUTBOUND_QUEUE_FRESH=1 to queue",
        },
        null,
        2,
      ),
    );
    return;
  }
  for (const p of fresh) {
    const r = await queueProspectOutreach(ws, p);
    if (r === "queued") queued++;
    else skip[r] = (skip[r] ?? 0) + 1;
  }
  console.log(JSON.stringify({ queued, skip, sampleSkip: Object.entries(skip).slice(0, 10) }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
