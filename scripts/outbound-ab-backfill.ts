#!/usr/bin/env npx tsx
/**
 * Backfill PENDING/DRAFT/APPROVED outbound leads with A/B templates + pre-generated audit URLs.
 * Does not send — human must re-approve after review.
 */
import { OutboundLeadStatus } from "@prisma/client";
import { ensureOutboundAudit } from "@/lib/outbound/ensure-outbound-audit";
import { generateOutboundAbEmail } from "@/lib/outbound/generate-uk-cold-draft";
import { prisma } from "@/lib/db/prisma";

async function main() {
  const wid = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
  if (!wid) {
    console.error("OUTBOUND_WORKSPACE_RESTAURANT_ID required");
    process.exit(1);
  }

  const leads = await prisma.outboundLead.findMany({
    where: {
      workspaceRestaurantId: wid,
      status: {
        in: [OutboundLeadStatus.PENDING_APPROVAL, OutboundLeadStatus.DRAFT, OutboundLeadStatus.APPROVED],
      },
      contactEmail: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  console.log(`Backfilling ${leads.length} leads…`);
  let ok = 0;
  let fail = 0;

  for (const lead of leads) {
    if (!lead.websiteUrl?.trim() || !lead.restaurantName?.trim()) {
      fail++;
      console.log("skip", lead.id, "missing website/name");
      continue;
    }

    const auditResult = await ensureOutboundAudit({
      restaurantName: lead.restaurantName,
      city: lead.city ?? "Your area",
      websiteUrl: lead.websiteUrl,
      placeId: lead.placeId,
      contactEmail: lead.contactEmail,
      existingAuditId: lead.visibilityAuditId,
    });

    if ("ok" in auditResult && auditResult.ok === false) {
      fail++;
      console.log("fail audit", lead.restaurantName, auditResult.error);
      continue;
    }
    if (!("auditId" in auditResult)) {
      fail++;
      continue;
    }

    const draft = generateOutboundAbEmail({
      stableId: lead.id,
      companyName: lead.restaurantName,
      auditUrl: auditResult.auditUrl,
    });

    await prisma.outboundLead.update({
      where: { id: lead.id },
      data: {
        emailVariant: draft.variant,
        messageSubject: draft.email_subject,
        messageBody: draft.message_body,
        suggestedTone: draft.suggested_tone,
        visibilityAuditId: auditResult.auditId,
        auditUrl: auditResult.auditUrl,
        status:
          lead.status === OutboundLeadStatus.APPROVED
            ? OutboundLeadStatus.PENDING_APPROVAL
            : lead.status,
        insightSummary: `${lead.insightSummary ?? "Outbound"} · email ${draft.variant} · ${auditResult.slug}`,
      },
    });

    if (lead.placeId) {
      await prisma.leadProspect.updateMany({
        where: { workspaceRestaurantId: wid, placeId: lead.placeId },
        data: { visibilityAuditId: auditResult.auditId },
      });
    }

    ok++;
    console.log("ok", draft.variant, lead.restaurantName, "→", draft.email_subject);
  }

  console.log({ ok, fail });
}

main().finally(() => prisma.$disconnect());
