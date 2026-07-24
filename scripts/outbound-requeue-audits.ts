#!/usr/bin/env npx tsx
/** Re-queue scan for outbound-linked audits still pending. */
import { parseAuditPayload } from "@/lib/audit/types";
import { prisma } from "@/lib/db/prisma";
import { inngest } from "@/inngest/client";

async function main() {
  const leads = await prisma.outboundLead.findMany({
    where: { visibilityAuditId: { not: null }, status: { in: ["PENDING_APPROVAL", "DRAFT", "APPROVED"] } },
    select: { visibilityAuditId: true, restaurantName: true, websiteUrl: true, placeId: true },
  });

  const ids = [...new Set(leads.map((l) => l.visibilityAuditId!).filter(Boolean))];
  console.log(`Checking ${ids.length} audits…`);

  let queued = 0;
  let skipped = 0;
  let inline = 0;

  for (const id of ids) {
    const audit = await prisma.visibilityAudit.findUnique({
      where: { id },
      select: { id: true, websiteUrl: true, restaurantName: true, resultPayload: true, slug: true },
    });
    if (!audit?.websiteUrl) {
      skipped++;
      continue;
    }
    const payload = parseAuditPayload(audit.resultPayload);
    if (payload?.scanStatus === "ready") {
      skipped++;
      continue;
    }

    const lead = leads.find((l) => l.visibilityAuditId === id);
    try {
      await inngest.send({
        name: "audit/run.requested",
        data: {
          auditId: audit.id,
          websiteUrl: audit.websiteUrl,
          siteScope: "one",
          userSocial: null,
          userImageUrls: null,
          placeLat: null,
          placeLng: null,
          placeLabel: audit.restaurantName,
          placePlaceId: lead?.placeId ?? null,
          placeFormattedAddress: null,
        },
      });
      queued++;
      console.log("queued", audit.slug || audit.id);
    } catch {
      // Fire-and-forget inline when Inngest is down
      void import("@/lib/audit/execute-audit-pipeline").then(({ executeAuditPipeline }) =>
        executeAuditPipeline(audit.id, {
          websiteUrl: audit.websiteUrl!,
          siteScope: "one",
          place: { name: audit.restaurantName, placeId: lead?.placeId ?? undefined },
        }).then(() => console.log("inline done", audit.slug || audit.id)),
      );
      inline++;
      console.log("inline start", audit.slug || audit.id);
    }
  }

  console.log({ queued, inline, skipped });
}

main().finally(() => prisma.$disconnect());
