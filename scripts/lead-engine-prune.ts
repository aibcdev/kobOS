#!/usr/bin/env npx tsx
import { pruneLegacyLeads } from "@/lib/lead-engine/prune-legacy-leads";
import { prisma } from "@/lib/db/prisma";

const workspaceId = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
if (!workspaceId) {
  console.error("Set OUTBOUND_WORKSPACE_RESTAURANT_ID");
  process.exit(1);
}

async function main() {
  const result = await pruneLegacyLeads(workspaceId!);
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
